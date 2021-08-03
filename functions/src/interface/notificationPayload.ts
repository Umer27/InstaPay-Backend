import {UserData} from "./UserData";

export interface NotificationPayload {
    [acceptedUser: string]: model
}

interface model extends Notification {
    UserData: UserData
}

export interface Notification {
    message?: string
    title?: string
}

export interface NotificationData {
    avatar?: string
    initiatorId?: string
    transactionId?: string,
    notificationType?: string
}



