import * as db from '../prisma/client'

export const getAllContacts = async () => {
    return await db.getAllContacts()
};

export const deleteAllContacts = async () => {
    return await db.deleteAllContacts()
};

export const identifyContact = async (email: string, phoneNumber: string) => {

    if (email == null && phoneNumber == null) {
        throw new Error("Both email and phoneNumber are null")
    }

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
    }
}
