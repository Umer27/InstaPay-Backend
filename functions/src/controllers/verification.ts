const serviceId = 'VA3945617fb9b8cf568cb0cd0d2f7cca0e'
const accountSid = 'AC63d4e17ceff92af6b1fd28bedb753ab9'
const authToken = 'd99abdebf6d40d19b10013b09e71d2c3'
const client = require('twilio')(accountSid, authToken);

exports.verification = async (req: any, res: any) => {
    try {
        const message: { status: string } = await client.verify.services(serviceId).verifications.create({
            to: req.body.number,
            channel: 'sms'
        })
        if (message.status === 'pending')
            res.status(200).send({
                message: 'Check your phone to get verification code'
            })
        else
            res.status(422).send({
                message: 'unprocessable entity'
            })

    } catch (err) {
        if (err.status === 400)
            res.status(400).send({
                message: 'Enter valid number'
            })
        else
            res.status(500).send({message: 'server phat gya', err: err})
        console.log('Firestore Query Failed:', err);
    }
}