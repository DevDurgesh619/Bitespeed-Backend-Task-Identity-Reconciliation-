import express from 'express';
// Note the .js extension, which is often required in ES Modules
import { identify } from './contact.controller.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.post('/identify', identify);
app.get('/', (req, res) => {
  res.send('Bitespeed Identity Reconciliation Service');
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

