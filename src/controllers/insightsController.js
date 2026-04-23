const { pool } = require('../config/db');

// CUSTOMER 360° - Get everything about a customer
const getCustomer360 = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const customer = await pool.query('SELECT * FROM customers WHERE id=$1 AND company_id=$2', [id, companyId]);
    if (!customer.rows[0]) return res.status(404).json({ error: 'Customer not found' });

    // Get all leads for this customer (by email or phone match)
    const leads = await pool.query(
      `SELECT * FROM leads WHERE company_id=$1 AND (customer_id=$2 OR email=$3 OR phone=$4) ORDER BY created_at DESC`,
      [companyId, id, customer.rows[0].email, customer.rows[0].phone]
    );

    // Get all conversations for this customer
    const conversations = await pool.query(
      `SELECT c.*, COUNT(m.id) as message_count
       FROM conversations c LEFT JOIN messages m ON c.id=m.conversation_id
       WHERE c.company_id=$1 AND c.customer_id=$2
       GROUP BY c.id ORDER BY c.updated_at DESC`,
      [companyId, id]
    );

    // Get all quotations through leads
    const leadIds = leads.rows.map(l => l.id);
    let quotations = { rows: [] };
    if (leadIds.length > 0) {
      quotations = await pool.query(
        `SELECT * FROM quotations WHERE lead_id = ANY($1::int[]) ORDER BY created_at DESC`,
        [leadIds]
      );
    }

    // Get all activities through leads
    let activities = { rows: [] };
    if (leadIds.length > 0) {
      activities = await pool.query(
        `SELECT a.*, u.name as user_name FROM activities a LEFT JOIN users u ON a.user_id=u.id
         WHERE a.lead_id = ANY($1::int[]) ORDER BY a.created_at DESC LIMIT 20`,
        [leadIds]
      );
    }

    // Calculate stats
    const totalRevenue = quotations.rows.filter(q => q.status === 'paid').reduce((a, q) => a + parseFloat(q.total || 0), 0);
    const pendingValue = quotations.rows.filter(q => q.status !== 'paid').reduce((a, q) => a + parseFloat(q.total || 0), 0);

    res.json({
      customer: customer.rows[0],
      leads: leads.rows,
      conversations: conversations.rows,
      quotations: quotations.rows,
      activities: activities.rows,
      stats: {
        totalLeads: leads.rows.length,
        totalConversations: conversations.rows.length,
        totalQuotations: quotations.rows.length,
        totalRevenue,
        pendingValue,
        wonLeads: leads.rows.filter(l => l.stage === 'won').length,
        firstContact: leads.rows.length > 0 ? leads.rows[leads.rows.length - 1].created_at : null,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// TODAY'S TASKS - Get all things needing attention today
const getTodayTasks = async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Activities with next_action_date today or overdue
    const tasks = await pool.query(
      `SELECT a.*, l.name as lead_name, l.id as lead_id, l.stage, u.name as user_name
       FROM activities a
       LEFT JOIN leads l ON a.lead_id=l.id
       LEFT JOIN users u ON a.user_id=u.id
       WHERE l.company_id=$1
         AND a.next_action IS NOT NULL
         AND a.next_action != ''
         AND a.next_action_date <= $2
       ORDER BY a.next_action_date ASC LIMIT 50`,
      [companyId, tomorrow]
    );

    // Inactive leads (no activity in 3+ days, not won/lost)
    const inactiveLeads = await pool.query(
      `SELECT l.*, MAX(a.created_at) as last_activity
       FROM leads l LEFT JOIN activities a ON a.lead_id=l.id
       WHERE l.company_id=$1 AND l.stage NOT IN ('won','lost')
       GROUP BY l.id
       HAVING MAX(a.created_at) IS NULL OR MAX(a.created_at) < NOW() - INTERVAL '3 days'
       ORDER BY l.created_at DESC LIMIT 20`,
      [companyId]
    );

    // Pending quotations (sent but not paid, > 7 days old)
    const pendingQuotes = await pool.query(
      `SELECT q.*, l.name as lead_name, l.id as lead_id
       FROM quotations q LEFT JOIN leads l ON q.lead_id=l.id
       WHERE l.company_id=$1 AND q.status != 'paid'
       AND q.created_at < NOW() - INTERVAL '3 days'
       ORDER BY q.created_at DESC LIMIT 20`,
      [companyId]
    );

    // New leads today
    const newToday = await pool.query(
      `SELECT * FROM leads WHERE company_id=$1 AND created_at >= $2 ORDER BY created_at DESC`,
      [companyId, today]
    );

    res.json({
      tasks: tasks.rows,
      inactiveLeads: inactiveLeads.rows,
      pendingQuotes: pendingQuotes.rows,
      newToday: newToday.rows,
      summary: {
        totalTasks: tasks.rows.length,
        overdue: tasks.rows.filter(t => new Date(t.next_action_date) < today).length,
        inactive: inactiveLeads.rows.length,
        pendingValue: pendingQuotes.rows.reduce((a, q) => a + parseFloat(q.total || 0), 0),
        newLeads: newToday.rows.length,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// REVENUE DASHBOARD - Real financial insights
const getRevenueDashboard = async (req, res) => {
  try {
    const { companyId } = req.user;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // This month revenue
    const thisMonth = await pool.query(
      `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as count
       FROM quotations q LEFT JOIN leads l ON q.lead_id=l.id
       WHERE l.company_id=$1 AND q.status='paid' AND q.paid_at >= $2`,
      [companyId, thisMonthStart]
    );

    // Last month revenue
    const lastMonth = await pool.query(
      `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as count
       FROM quotations q LEFT JOIN leads l ON q.lead_id=l.id
       WHERE l.company_id=$1 AND q.status='paid' AND q.paid_at >= $2 AND q.paid_at < $3`,
      [companyId, lastMonthStart, thisMonthStart]
    );

    // Outstanding (unpaid)
    const outstanding = await pool.query(
      `SELECT COALESCE(SUM(total),0) as amount, COUNT(*) as count
       FROM quotations q LEFT JOIN leads l ON q.lead_id=l.id
       WHERE l.company_id=$1 AND q.status != 'paid'`,
      [companyId]
    );

    // Channel ROI - revenue by source
    const channelROI = await pool.query(
      `SELECT l.source, COUNT(DISTINCT l.id) as leads_count,
              COUNT(DISTINCT q.id) FILTER (WHERE q.status='paid') as won_count,
              COALESCE(SUM(q.total) FILTER (WHERE q.status='paid'), 0) as revenue
       FROM leads l LEFT JOIN quotations q ON q.lead_id=l.id
       WHERE l.company_id=$1 AND l.source IS NOT NULL AND l.source != ''
       GROUP BY l.source ORDER BY revenue DESC`,
      [companyId]
    );

    // Top customers by revenue
    const topCustomers = await pool.query(
      `SELECT l.name, l.company, l.email, l.phone,
              COUNT(q.id) as quotation_count,
              COALESCE(SUM(q.total) FILTER (WHERE q.status='paid'), 0) as total_paid
       FROM leads l LEFT JOIN quotations q ON q.lead_id=l.id
       WHERE l.company_id=$1
       GROUP BY l.id, l.name, l.company, l.email, l.phone
       HAVING COALESCE(SUM(q.total) FILTER (WHERE q.status='paid'), 0) > 0
       ORDER BY total_paid DESC LIMIT 10`,
      [companyId]
    );

    // Stage conversion (funnel)
    const funnel = await pool.query(
      `SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as value
       FROM leads WHERE company_id=$1 GROUP BY stage`,
      [companyId]
    );

    // Daily revenue (last 30 days)
    const dailyRevenue = await pool.query(
      `SELECT DATE(q.paid_at) as date, COALESCE(SUM(q.total),0) as revenue, COUNT(*) as count
       FROM quotations q LEFT JOIN leads l ON q.lead_id=l.id
       WHERE l.company_id=$1 AND q.status='paid' AND q.paid_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(q.paid_at) ORDER BY date ASC`,
      [companyId]
    );

    const thisRevenue = parseFloat(thisMonth.rows[0].revenue);
    const lastRevenue = parseFloat(lastMonth.rows[0].revenue);
    const growth = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    res.json({
      thisMonth: { revenue: thisRevenue, count: parseInt(thisMonth.rows[0].count) },
      lastMonth: { revenue: lastRevenue, count: parseInt(lastMonth.rows[0].count) },
      growth,
      outstanding: { amount: parseFloat(outstanding.rows[0].amount), count: parseInt(outstanding.rows[0].count) },
      channelROI: channelROI.rows,
      topCustomers: topCustomers.rows,
      funnel: funnel.rows,
      dailyRevenue: dailyRevenue.rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { getCustomer360, getTodayTasks, getRevenueDashboard };
