import * as admin from 'firebase-admin'
import {NotificationPayload} from "../interface/notificationPayload";
import {createInstapayUserFirestore, setUserAccDataFirstore} from "./FireStore";

export async function setUserData(data: NotificationPayload, users: string[], initiatorId: string, transactionId: string): Promise<void> {
    try {
        const initiatorDoc = await admin.firestore().collection('Users').doc(initiatorId).get()
        const initiatorData = initiatorDoc.data()
        if (initiatorData) {
            for (const userId of users) {
                try {
                    const userDoc = await admin.firestore().collection('Users').doc(userId).get()
                    const tokenDoc = await admin.firestore().collection('Users_Tokens').doc(userId).get()
                    const userData = userDoc.data()
                    const tokenData = tokenDoc.data()
                    if (userData && tokenData) {
                        data[userId] = {
                            UserData: {
                                name: userData.name,
                                token: tokenData.fcmToken,
                                avatar: initiatorData.avatar,
                                initiatorId: initiatorId,
                                transactionId: transactionId,
                                notificationType: 'normal'
                            }
                        }
                    }
                } catch (err) {
                    console.log('Set Notification User Data Get:' + err)
                }
            }
        }
    } catch (err) {
        console.log('Set Users Data Get:' + err)

    }

}

export async function setUserDataFromMerchant(data: NotificationPayload, users: string[]): Promise<void> {
    try {
        for (const userId of users) {
            try {
                const userDoc = await admin.firestore().collection('Users').doc(userId).get()
                const tokenDoc = await admin.firestore().collection('Users_Tokens').doc(userId).get()
                const userData = userDoc.data()
                const tokenData = tokenDoc.data()
                if (userData && tokenData) {
                    data[userId] = {
                        UserData: {
                            name: userData.name,
                            token: tokenData.fcmToken,
                            avatar: "",
                            initiatorId: "",
                            transactionId: "",
                            notificationType: 'system'
                        }
                    }
                }
            } catch (err) {
                console.log('Set Notification User Data Get:' + err)
            }
        }

    } catch (err) {
        console.log('Set Users Data Get:' + err)

    }

}

export async function createInstapayUser(userData: any): Promise<void> {
    await createInstapayUserFirestore(userData)
}

export async function createInstapayAccount(userData: any): Promise<void> {
    await setUserAccDataFirstore(userData)
}

