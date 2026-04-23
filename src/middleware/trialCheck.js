const { pool } = require('../config/db');

const trialCheck = async (req, res, next) => {
  try {
    if (!req.user || !req.user.companyId) return next();
    
    // Allow these endpoints even when trial expired
    const allowedPaths = ['/api/company', '/api/auth', '/api/billing'];
    if (allowedPaths.some(p => req.path.startsWith(p))) return next();
    
    const result = await pool.query('SELECT trial_ends_at, plan FROM companies WHERE id=$1', [req.user.companyId]);
    if (!result.rows[0]) return next();
    
    const { trial_ends_at, plan } = result.rows[0];
    if (plan !== 'trial') return next();
    
    if (new Date(trial_ends_at) < new Date()) {
      return res.status(402).json({ 
        error: 'Trial expired', 
        trialExpired: true,
        message: 'Your 14-day trial has ended. Please upgrade to continue.' 
      });
    }
    next();
  } catch (e) {
    next();
  }
};

module.exports = trialCheck;
