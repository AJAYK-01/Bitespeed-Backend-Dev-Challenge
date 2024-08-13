import prisma from '../prisma/client';

export const getAllContacts = async () => {
    return await prisma.contact.findMany();
};

export const deleteAllContacts = async () => {
    return await prisma.contact.deleteMany();
};

export const identifyContact = async (email: string, phoneNumber: string) => {
    const duplicateContact = await findDuplicateContact(email, phoneNumber);
    if (duplicateContact) {
        const primaryContact = duplicateContact.linkedId
            ? await getContactById(duplicateContact.linkedId)
            : duplicateContact

        if (primaryContact?.email && primaryContact.phoneNumber) {
            const existingContacts = await findLinkedContacts(primaryContact.email, primaryContact.phoneNumber);
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

            return {
                primaryContactId: primaryContact.id,
                emails: Array.from(existingEmails),
                phoneNumbers: Array.from(existingPhoneNumbers),
                secondaryContactIds: Array.from(secondaryContactIds)
            }
        }
    }
    else {
        return createContact(email, phoneNumber)
    }
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
