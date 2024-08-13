import { Request, Response } from 'express';
import * as contactService from '../services/contactService';
import { createErrorResponse } from '../utils/errorHandler';

export const getContacts = async (_: Request, res: Response) => {
    try {
        const contacts = await contactService.getAllContacts();
        res.json(contacts);
    } catch (error) {
        createErrorResponse(res, error, 'Error fetching contacts');
    }
};

export const deleteContacts = async (_: Request, res: Response) => {
    try {
        const deletedCount = await contactService.deleteAllContacts();
        res.json(deletedCount);
    } catch (error) {
        createErrorResponse(res, error, 'Error deleting contacts');
    }
};

export const createContact = async (req: Request, res: Response) => {
    const { email, phoneNumber } = req.body;

    try {
        const newContact = await contactService.createContact(email, phoneNumber);
        res.status(201).json({ contact: newContact });
    } catch (error) {
        createErrorResponse(res, error, 'Error creating new contact');
    }
};

export const identifyContact = async (req: Request, res: Response) => {
    const { email, phoneNumber } = req.body;

    try {
        const newContact = await contactService.identifyContact(email, phoneNumber);
        res.status(201).json({ contact: newContact });
    } catch (error) {
        createErrorResponse(res, error, 'Error creating new contact');
    }
};
