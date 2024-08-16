import { Contact } from '@prisma/client';
import prisma from '../prisma/client';
import * as db from '../prisma/client'

export const getAllContacts = async () => {
    return await prisma.contact.findMany();
};

export const deleteAllContacts = async () => {
    return await prisma.contact.deleteMany();
};

export const identifyContact = async (email: string, phoneNumber: string) => {
    // case 1: New Primary Creation
    // condition: no duplicate contact, no linked contact

    // const duplicateContact = db.getDuplicateContact(email, phoneNumber)
    // const linkedContacts: Contact[] = await findLinkedContacts(email, phoneNumber)
    // if (duplicateContact) {
    //     const newContact = await db.createNewContact(email, phoneNumber, null)
    //     return {
    //         id: newContact.id,
    //         emails: [newContact.email],
    //         phoneNumbers: [newContact.phoneNumber],
    //         secondaryContactIds: [],
    //         message: "New Contact - Primary"
    //     }
    // }

    // case 2: New Secondary Creation
    // condition: no duplicate, some linked maybe be there
    // additional requirement to update primary in case multiple primary
    // const duplicateContact: Contact | null = await db.getDuplicateContact(email, phoneNumber)
    // if (!isDuplicate) {
    const primaryContact = await db.findAndUpdatePrimaryContact(email, phoneNumber)
    const newContact = await db.createNewContact(email, phoneNumber, primaryContact.id)
    const linkedContactsToPrimary = await db.findLinkedContactsToPrimary(primaryContact.id)

    const linkedEmails = [...new Set(linkedContactsToPrimary.map(contact => contact.email).filter(email => email !== null))];
    const linkedPhoneNumbers = [...new Set(linkedContactsToPrimary.map(contact => contact.phoneNumber).filter(phoneNumber => phoneNumber !== null))];
    const linkedSecondaryContactIds = Array.from(linkedContactsToPrimary.reduce((ids, contact) => {
        if (contact.id !== primaryContact.id) {
            ids.add(contact.id);
        }
        return ids;
    }, new Set<number>()));

    return {
        id: newContact.id,
        primaryContact: primaryContact.id,
        emails: linkedEmails,
        phoneNumbers: linkedPhoneNumbers,
        secondaryContactIds: linkedSecondaryContactIds,
        // message: duplicateContact == null ? "New Contact - Secondary" : "Existing contact - Secondary"
    }
    // }

    return { message: "WIP" }

}

export const createContact = async (email: string, phoneNumber: string) => {

    const existingContacts = await findLinkedContacts(email, phoneNumber);
    const primaryContactId = await updatePrimaryContact(existingContacts);

    const newContact = await prisma.contact.create({
        data: {
            email: email,
            phoneNumber: phoneNumber,
            linkedId: primaryContactId,
            linkPrecedence: primaryContactId ? 'secondary' : 'primary'
        }
    });

    if (primaryContactId == null) {
        return {
            id: newContact.id,
            primaryContactId: primaryContactId,
            emails: [newContact.email],
            phoneNumbers: [newContact.phoneNumber],
            secondaryContactIds: [],
            message: "New Primary Contact created"
        }
    }

    if (newContact != null) {
        const { existingEmails, existingPhoneNumbers, secondaryContactIds } =
            existingContacts.reduce(
                (acc, existingContact) => {
                    if (existingContact.linkedId != null)
                        acc.secondaryContactIds.add(existingContact.id);
                    if (existingContact.phoneNumber != null)
                        acc.existingPhoneNumbers.add(existingContact.phoneNumber);
                    if (existingContact.email != null)
                        acc.existingEmails.add(existingContact.email);
                    return acc;
                },
                {
                    existingEmails: new Set<string>(),
                    existingPhoneNumbers: new Set<string>(),
                    secondaryContactIds: new Set<number>(),
                }
            );

        if (newContact.email) {
            existingEmails.add(newContact.email)
        }
        if (newContact.phoneNumber) {
            existingPhoneNumbers.add(newContact.phoneNumber)
        }
        secondaryContactIds.add(newContact.id)

        return {
            primaryContactId: primaryContactId,
            emails: Array.from(existingEmails),
            phoneNumbers: Array.from(existingPhoneNumbers),
            secondaryContactIds: Array.from(secondaryContactIds)
        }

    }
};

const getContactById = async (id: number) => {
    return await prisma.contact.findFirst({
        where: {
            id: id
        }

    })
}

const findDuplicateContact = async (email: string, phoneNumber: string) => {
    return await prisma.contact.findFirst({
        where: {
            AND: [
                { email: email },
                { phoneNumber: phoneNumber }
            ]
        }
    });
};

const findLinkedContacts = async (email: string, phoneNumber: string) => {
    return await prisma.contact.findMany({
        where: {
            OR: [
                { email: email },
                { phoneNumber: phoneNumber }
            ]
        }
    });
};

const findContactsWithPrimary = async (primaryContactId: number) => {
    return await prisma.contact.findMany({
        where: {
            linkedId: primaryContactId
        }
    });
};

const updatePrimaryContact = async (existingContacts: any[]) => {
    let primaryContactId: number | undefined;

    if (existingContacts.length > 0) {
        const primaryContacts = existingContacts.filter(contact => contact.linkPrecedence === 'primary');

        if (primaryContacts.length > 0) {
            primaryContactId = primaryContacts[0].id;
            await Promise.all(
                primaryContacts.map(async (primaryContact) => {
                    if (primaryContact.id != primaryContactId) {
                        await prisma.contact.update({
                            where: { id: primaryContact.id },
                            data: { linkedId: primaryContactId, linkPrecedence: 'secondary' }
                        });
                    }
                })
            );
        } else {
            primaryContactId = existingContacts[0].id;
            await prisma.contact.update({
                where: { id: primaryContactId },
                data: { linkPrecedence: 'primary' }
            });
        }
    }

    return primaryContactId;
};
