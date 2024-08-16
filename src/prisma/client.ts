import { Contact, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getContactById = async (id: number) => {
    const contact = await prisma.contact.findFirst({
        where: {
            id: id
        }
    })

    if (contact == null) throw ("No contact found")
    else return contact
}

// creates new contact only if it does not exist, will not update any existing data
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

const getPrimaryContact = async (email: string, phoneNumber: string) => {
    const firstLink = await prisma.contact.findFirst({
        where: {
            OR: [
                { email: email },
                { phoneNumber: phoneNumber }
            ]
        }
    });
    if (firstLink != null)
        return await getContactById(firstLink.linkedId ?? firstLink.id)

}

// creates new primary contact if no links
// combines multiple primary contacts into one primary and other secondary
export const findAndUpdatePrimaryContact = async (email: string, phoneNumber: string) => {
    const duplicateContact: Contact | null = await getDuplicateContact(email, phoneNumber)
    if (duplicateContact != null) {
        if (duplicateContact.linkedId) return await getContactById(duplicateContact.linkedId)
        else return duplicateContact
    }

    const primaryContact = await getPrimaryContact(email, phoneNumber)

    if (!primaryContact) {
        return await createNewContact(email, phoneNumber, null)
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
