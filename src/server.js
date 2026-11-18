require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { testConnection } = require('./config/db');
const settingsRoutes = require('./routes/settings');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const catalogsRoutes = require('./routes/catalogs');
const customersRoutes = require('./routes/customers');
const careRoutes = require('./routes/care');
const appointmentsRoutes = require('./routes/appointments');
const productsRoutes = require('./routes/products');
const tasksRoutes = require('./routes/tasks');
const ktvTimeRoutes = require('./routes/ktvTime');
const customerSearchRoutes = require('./routes/customerSearch');
const salesStatsRoutes = require('./routes/salesStats');
const financeRoutes = require('./routes/finance');
const staffRoutes = require('./routes/staff');
const timesheetRoutes = require('./routes/timesheet');

const app = express();
const PORT = Number(process.env.PORT || 3000);  

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({ ok: true, db: dbStatus.info });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.use('/api/settings', settingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/catalogs', catalogsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/care', careRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/ktv-time', ktvTimeRoutes);
app.use('/api/customer-search', customerSearchRoutes);
app.use('/api/sales-stats', salesStatsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/timesheet', timesheetRoutes);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint không tồn tại.' });
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CRMPLUS Node server running at http://localhost:${PORT}`);
});
