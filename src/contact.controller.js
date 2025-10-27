import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const identify = async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'Either email or phoneNumber must be provided.' });
  }
  if (email && typeof email !== 'string') {
    return res.status(400).json({ error: 'Input Error: email must be a string.' });
  }
    if (phoneNumber && typeof phoneNumber !== 'string') {
    return res.status(400).json({ error: 'Input Error: phoneNumber must be a string.' });
  }
  
  try {
    const matchingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email ? email : undefined },
          { phoneNumber: phoneNumber ? phoneNumber : undefined },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    if (matchingContacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: 'PRIMARY',
        },
      });

      return res.status(200).json({
        contact: {
          primaryContactId: newContact.id,
          emails: [newContact.email].filter(Boolean),
          phoneNumbers: [newContact.phoneNumber].filter(Boolean),
          secondaryContactIds: [],
        },
      });
    }

    const oldestContact = matchingContacts[0];
    let primaryContact;

    if (oldestContact.linkPrecedence === 'PRIMARY') {
      primaryContact = oldestContact;
    } else {
      primaryContact = await prisma.contact.findUnique({
        where: { id: oldestContact.linkedId },
      });
      if (!primaryContact) {
        throw new Error('Data inconsistency: Secondary contact points to non-existent primary.');
      }
    }
    const truePrimaryId = primaryContact.id;
    
    const entireContactGroup = await prisma.contact.findMany({
      where: {
        OR: [
          { id: truePrimaryId },
          { linkedId: truePrimaryId },
        ],
      }
    });

    const allPrimaryIds = new Set(
      matchingContacts.map((c) => (c.linkPrecedence === 'PRIMARY' ? c.id : c.linkedId))
    );
    const idsToUpdate = Array.from(allPrimaryIds).filter(
      (id) => id !== truePrimaryId
    );
    
    if (idsToUpdate.length > 0) {
      await prisma.contact.updateMany({
        where: {
          id: { in: idsToUpdate },
        },
        data: {
          linkedId: truePrimaryId,
          linkPrecedence: 'SECONDARY',
        },
      });
    }

    const isEmailNew = email && !entireContactGroup.some(c => c.email === email);
    const isPhoneNew = phoneNumber && !entireContactGroup.some(c => c.phoneNumber === phoneNumber);

    if (isEmailNew || isPhoneNew) {
        await prisma.contact.create({ 
            data: {
                email,
                phoneNumber,
                linkedId: truePrimaryId,
                linkPrecedence: 'SECONDARY',
            } 
        });
    }

    const finalContactGroup = await prisma.contact.findMany({
      where: {
        OR: [
          { id: truePrimaryId },
          { linkedId: truePrimaryId },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const allEmails = [...new Set(finalContactGroup.map((c) => c.email).filter(Boolean))];
    const allPhoneNumbers = [...new Set(finalContactGroup.map((c) => c.phoneNumber).filter(Boolean))];
    const secondaryContactIds = finalContactGroup
      .filter((c) => c.id !== truePrimaryId)
      .map((c) => c.id);

    return res.status(200).json({
      contact: {
        primaryContactId: truePrimaryId,
        emails: allEmails,
        phoneNumbers: allPhoneNumbers,
        secondaryContactIds: secondaryContactIds,
      },
    });

  } catch (error) {
    console.error("Error in /identify:", error);
    return res.status(500).json({ error: 'Internal ServerError' });
  }
};

