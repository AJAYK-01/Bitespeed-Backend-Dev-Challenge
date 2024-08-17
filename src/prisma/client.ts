import { Contact, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export const getAllContacts = async () => {
    return await prisma.contact.findMany();
};

export const deleteAllContacts = async () => {
    return await prisma.contact.deleteMany();
};


/**
 * Creates a new contact only if the provided email and phone number 
 * do not match any existing contact information. The function will 
 * not update any existing data.
 */
export const createNewContact = async (email: string, phoneNumber: string, primaryContactId: number | null) => {
    const duplicateContact = await getDuplicateContact(email, phoneNumber)
    if (duplicateContact) {
        return duplicateContact
    }

    const duplicateContactForNulls = await getDuplicateContactForNulls(email, phoneNumber)
    if (duplicateContactForNulls) {
        return duplicateContactForNulls
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


/**
 * Finds and updates the primary contact based on the provided email and phone number.
 * 
 * - If there is no linked contact, it creates a new primary contact.
 * - If multiple primary contacts exist, it chooses one of them as primary contact, 
 *   marking the others as secondary.
 */
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

/**
 * 
 * Find all linked contacts to a primary using the linkedId property
 */
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

const getDuplicateContact = async (email: string, phoneNumber: string) => {
    return await prisma.contact.findFirst({
        where: {
            AND: [
                { email: email },
                { phoneNumber: phoneNumber }
            ]
        }
    });
}

const getDuplicateContactForNulls = async (email: string, phoneNumber: string) => {
    const emailContact: Contact | null = await prisma.contact.findFirst({
        where: { email: email }
    });
    const phoneContact: Contact | null = await prisma.contact.findFirst({
        where: { phoneNumber: phoneNumber }
    });

    if ((email == null || emailContact) && (phoneNumber == null || phoneContact)) {
        return emailContact ?? phoneContact
    }
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

const getContactById = async (id: number) => {
    const contact = await prisma.contact.findFirst({
        where: {
            id: id
        }
    })

    if (contact == null) throw new Error("No contact found")
    else return contact
}