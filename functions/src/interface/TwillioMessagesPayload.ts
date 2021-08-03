export interface MessagePayload {
    [acceptedUser: string]: model
}

interface model {
    phoneNumber: string,
    message?: string
}