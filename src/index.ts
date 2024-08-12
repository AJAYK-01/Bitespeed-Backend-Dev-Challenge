import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

app.get('/contacts', async (_, res) => {
    try {
        const contacts = await prisma.contact.findMany();
        res.json(contacts);
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error('Error fetching contacts:', errorMessage);
        res.status(500).json({ error: errorMessage });
    }
});

app.delete('/contacts', async (_, res) => {
    try {
        const deletedCount = await prisma.contact.deleteMany();
        res.json(deletedCount);
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error('Error fetching contacts:', errorMessage);
        res.status(500).json({ error: errorMessage });
    }
});

app.post('/contact', async (req, res) => {
    const { email, phoneNumber } = req.body;

    try {
        const isDupllicate = await prisma.contact.findFirst({
            where: {
                AND: [
                    { email: email },
                    { phoneNumber: phoneNumber }
                ]
            }
        })

        if (isDupllicate) {
            res.status(200).json({
                message: "Contact already exists",
                contact: isDupllicate
            });
            return
        }

        const existingContacts = await prisma.contact.findMany({
            where: {
                OR: [
                    { email: email },
                    { phoneNumber: phoneNumber }
                ]
            }
        });

        let primaryContactId: number | null = null;

        if (existingContacts.length > 0) {
            const primaryContacts = existingContacts.filter(contact => contact.linkPrecedence === 'primary');
            if (primaryContacts.length > 0) {
                primaryContactId = primaryContacts[0].id;
                primaryContacts.forEach(async (primaryContact) => {
                    if (primaryContact.id != primaryContactId) {
                        await prisma.contact.update({
                            where: { id: primaryContact.id },
                            data: { linkedId: primaryContactId, linkPrecedence: 'secondary' },
                        })
                    }
                })
            } else {
                primaryContactId = existingContacts[0].id;
                await prisma.contact.update({
                    where: { id: primaryContactId },
                    data: { linkPrecedence: 'primary' }
                });
            }
        }

        const newContact = await prisma.contact.create({
            data: {
                email: email,
                phoneNumber: phoneNumber,
                linkedId: primaryContactId,
                linkPrecedence: primaryContactId ? 'secondary' : 'primary'
            }
        });

        res.status(201).json({ contact: newContact });
    } catch (error) {
        const errorMessage = (error as Error).message;
        res.status(500).json({ error: errorMessage });
    }
});

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});