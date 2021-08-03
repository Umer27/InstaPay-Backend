import {MessagePayload} from "../interface/TwillioMessagesPayload";

const accountSid = 'AC63d4e17ceff92af6b1fd28bedb753ab9'
const authToken = 'd99abdebf6d40d19b10013b09e71d2c3'
const client = require('twilio')(accountSid, authToken);

export async function sendTwilioMessage(mesData: MessagePayload, user: string[]): Promise<void> {
    for (const id of user) {
        const message: string = mesData[id].message || "";
        await sendMessage(mesData[id].phoneNumber, message);
    }
}

export async function sendMessage(number: string, body: string): Promise<void> {
    try {
        await client.messages
            .create({
                body: body,
                from: '+12058436522',
                statusCallback: 'http://postb.in/1234abcd',
                to: number
            })

    } catch (err) {
        console.log('Firestore Query Failed:', err);
    }
}

export async function setTwilioMessages(mesData: MessagePayload, user: string[], transData: FirebaseFirestore.DocumentData, transPerformed: boolean): Promise<void> {
    for (const id of user) {
        const amount = transData.transactions[id].amount
        const initiatorName = transData.initiatorName

        if (transData.transactions[id].creditor === id) {
            let message = `${initiatorName} has invited you to use InstaPay and  credited you an amount of Rs. ${amount} in ${transData.groupName} transaction, Please install InstaPay via: creativemorph.com`
            if (transPerformed)
                message = `${initiatorName} has invited you to use InstaPay and  credited you an amount of Rs. ${amount}, Please install InstaPay via: creativemorph.com`
            mesData[id] = {
                phoneNumber: transData.transactions[id].creditorName,
                message: message
            }
        } else {
            let message = `${initiatorName} has invited you to use InstaPay and requested you an amount of Rs. ${amount}, Please install InstaPay via: creativemorph.com`
            if (transData.transactionMode === 'group')
                message = `${initiatorName} has invited you to use InstaPay and  credited you an amount of Rs. ${amount} in ${transData.groupName} transaction, Please install InstaPay via: creativemorph.com`
            mesData[id] = {
                phoneNumber: transData.transactions[id].debitorName,
                message: message
            }
        }

    }
}

export async function sendTwillioMsgToAllInvitedCreditors(transData: FirebaseFirestore.DocumentData) {
    const mesData: MessagePayload = {}
    //Form Messages
    await setTwilioMessages(mesData, transData.invitedCreditors, transData, true);
    //send twilio messages
    await sendTwilioMessage(mesData, transData.invitedCreditors);
}


