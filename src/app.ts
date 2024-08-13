import express from 'express';
import cors from 'cors';
import contactRoutes from './routes/contactRoutes';

const app = express();

app.use(express.json());
app.use(cors());
app.use('/api', contactRoutes);

export default app;
