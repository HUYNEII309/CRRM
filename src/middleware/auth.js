const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'crmplus_secret_key_change_me_in_production';

function signToken(user) {
  return jwt.sign(
    {
      idnhanvien: user.idnhanvien,
      hoten: user.hoten,
      tendangnhap: user.tendangnhap,
      idbophan: user.idbophan,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Chưa đăng nhập hoặc thiếu token xác thực.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn hoặc token không hợp lệ.' });
  }
}

module.exports = {
  signToken,
  authMiddleware,
};
