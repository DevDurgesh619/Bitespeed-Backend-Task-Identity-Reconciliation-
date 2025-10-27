Bitespeed Identity Reconciliation Task

This repository contains the backend solution for the Bitespeed Identity Reconciliation assignment. The server is built with Node.js, Express, and Prisma (with PostgreSQL) to manage and consolidate contact identities.

Problem Overview

The core task is to build a backend service that can track a single person's identity across multiple contact methods. A user might provide an email at one time, a phoneNumber at another, and then both at a later time. The system must recognize these as the same individual, link them under a single "primary" contact, and return a consolidated view of all their known emails and phone numbers.

Core Logic Explained

The entire solution revolves around a single Contact model with two key fields:

linkPrecedence: An enum that is either PRIMARY or SECONDARY.

linkedId: A self-referential foreign key.

If a contact is PRIMARY, linkedId is null.

If a contact is SECONDARY, linkedId points to the id of its PRIMARY contact.

The Golden Rule: Oldest Contact Wins

The logic identifies the "true primary" contact by its createdAt timestamp.

When a new request comes in, the system finds all contacts matching the email OR phoneNumber.

From this list, the oldest contact (earliest createdAt) is identified as the leader.

If this leader is a SECONDARY contact, the system follows its linkedId to find the true PRIMARY contact.

All reconciliation (merging, linking) is performed with this single PRIMARY contact.

Merging Two Identities

The most complex scenario is when a request links two previously separate PRIMARY contacts.

Example: Contact 1 (PRIMARY, a@a.com) and Contact 2 (PRIMARY, 123@123) exist.

Request: { "email": "a@a.com", "phoneNumber": "123@123" }

Action: The system finds both contacts. It sees Contact 1 is older. It updates Contact 2, changing its linkPrecedence to SECONDARY and setting its linkedId to 1.

Result: The system now has only one PRIMARY contact (ID 1) and all related info is linked to it.

Creating New Contacts (Idempotency)

A new SECONDARY contact is only created if the request introduces a new piece of information (an email or phone number) that is not already associated with that identity group.

Requests containing only known information (e.g., { "email": "a@a.com", "phoneNumber": null } when a@a.com is already known) will not create a new contact. They will simply find the existing group and return the consolidated view.

Tech Stack

Runtime: Node.js

Framework: Express.js

ORM: Prisma

Database: PostgreSQL (e.g., on Neon)

Getting Started

API Endpoint

POST /identify

This is the only endpoint. It accepts a JSON body with an email and/or phoneNumber.

Request Body:

{
  "email": "user@example.com",
  "phoneNumber": "123456"
}


Success Response (200 OK):

{
  "contact": {
    "primaryContactId": 1,
    "emails": ["user@example.com", "another@example.com"],
    "phoneNumbers": ["123456", "789012"],
    "secondaryContactIds": [2, 3]
  }
}


Error Response (400 Bad Request):

{
  "error": "Input Error: email must be a string."
}


How to Test (Using Postman)

Open Postman and create a new request.

Set the method to POST.

Set the URL to http://localhost:3000/identify.

Go to the Body tab, select raw, and choose JSON from the dropdown.

Use the JSON payloads below to test the different scenarios.

Test 1: Create First Primary Contact

Payload:

{
  "email": "george@hillvalley.edu",
  "phoneNumber": "919191"
}


Result: Creates a new PRIMARY contact (e.g., ID 1).

Test 2: Create Second Primary Contact

Payload:

{
  "email": "biffsucks@hillvalley.edu",
  "phoneNumber": "717171"
}


Result: Creates a new, separate PRIMARY contact (e.g., ID 2).

Test 3: The "Merge"

This request links the two contacts from Test 1 and Test 2.

Payload:

{
  "email": "george@hillvalley.edu",
  "phoneNumber": "717171"
}


Result:

Finds Contact 1 (older) and Contact 2 (newer).

Updates Contact 2: linkPrecedence -> SECONDARY, linkedId -> 1.

Does NOT create a new contact because both pieces of information were already known.

Response:

{
  "contact": {
    "primaryContactId": 1,
    "emails": ["george@hillvalley.edu", "biffsucks@hillvalley.edu"],
    "phoneNumbers": ["919191", "717171"],
    "secondaryContactIds": [2]
  }
}


Test 4: Add New Information to the Group

This request adds a new phone number to the merged group.

Payload:

{
  "email": "george@hillvalley.edu",
  "phoneNumber": "888888"
}


Result: Creates a new SECONDARY contact (e.g., ID 3) linked to ID 1.

Test 5: Test Idempotency (No New Contact)

This request uses information that is already known and linked to the primary contact.

Payload:

{
  "email": "biffsucks@hillvalley.edu",
  "phoneNumber": null
}


Result:

Finds the group belonging to Primary ID 1.

Sees that "biffsucks@hillvalley.edu" is not new information.

Does NOT create a new contact.

Returns the consolidated view for Primary ID 1.

Test 6: Test Input Validation

Payload:

{
  "email": 12345
}


Result: Returns a 400 Bad Request.

{
  "error": "Input Error: email must be a string."
}
