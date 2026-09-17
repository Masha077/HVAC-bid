import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`[HVAC BIS Backend] Server running on port ${PORT} (${NODE_ENV})`);
  if (NODE_ENV !== 'production') {
    console.log(`[HVAC BIS Backend] Master Webhook URL: http://localhost:${PORT}/api/v1/webhook`);
  }
});
