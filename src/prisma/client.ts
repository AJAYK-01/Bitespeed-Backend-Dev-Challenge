import { Contact, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getContactById = async (id: number) => {
    const contact = await prisma.contact.findFirst({
        where: {
            id: id
        }
    })

    if (contact == null) throw ("No contact found")
    else return contact
}

export const createNewContact = async (email: string, phoneNumber: string, primaryContactId: number | null) => {
    const duplicateContact: Contact | null = await getDuplicateContact(email, phoneNumber)
    if (duplicateContact) {
        return duplicateContact
    }
    return await prisma.contact.create({
        data: {
            email: email,
            phoneNumber: phoneNumber,
            linkedId: primaryContactId,
            linkPrecedence: primaryContactId ? 'secondary' : 'primary'
        }
    });
}

export const getDuplicateContact = async (email: string, phoneNumber: string) => {
    return await prisma.contact.findFirst({
        where: {
            AND: [
                { email: email },
                { phoneNumber: phoneNumber }
            ]
        }
    });
}

export const findAndUpdatePrimaryContact = async (email: string, phoneNumber: string) => {
    const duplicateContact: Contact | null = await getDuplicateContact(email, phoneNumber)
    if (duplicateContact != null) {
        if (duplicateContact.linkedId) return await getContactById(duplicateContact.linkedId)
        else return duplicateContact
    }

    const primaryContact: Contact | null = await prisma.contact.findFirst({
        where: {
            AND: [
                { linkPrecedence: 'primary' },
                {
                    OR: [
                        { email: email },
                        { phoneNumber: phoneNumber }
                    ]
                }
            ]
        }
    })

    if (primaryContact == null) {
        throw ("No primary contacts found")
    }

    await prisma.contact.updateMany({
        data: {
            linkPrecedence: 'secondary',
            linkedId: primaryContact.id
        },
        where: {
            AND: [
                { id: { not: primaryContact.id } },
                {
                    OR: [
                        { email: email },
                        { phoneNumber: phoneNumber }
                    ]
                }
            ]
        }
    })

    return primaryContact
}

export const findLinkedContactsToPrimary = async (primaryContactId: number) => {
    const contacts = await prisma.contact.findMany({
        where: {
            OR:
                [
                    { linkedId: primaryContactId },
                    { id: primaryContactId }
                ]
        },
        select: {
            email: true,
            phoneNumber: true,
            id: true,
        },
    });

    return contacts
}

export default prisma;
