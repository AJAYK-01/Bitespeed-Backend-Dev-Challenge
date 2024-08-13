import { Response } from 'express';

export const createErrorResponse = (res: Response, error: unknown, customMessage = 'Unknown Error') => {
    const errorMessage = (error as Error).message;
    console.error(customMessage, errorMessage);
    res.status(500).json({ error: customMessage, details: errorMessage });
};
