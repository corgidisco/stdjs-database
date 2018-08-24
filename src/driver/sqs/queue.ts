
import { SQS } from "aws-sdk"
import { Queue, SendQueueOptions } from "../../interfaces/queue"
import { SqsJob } from "./job"
import { purgeQueue, receiveMessages, sendMessage } from "./promise"

export class SqsQueue<P> implements Queue<P> {

  constructor(public client: SQS, public url: string) {
  }

  public async close(): Promise<void> {
    //
  }

  public async flush(): Promise<void> {
    await purgeQueue(this.client, {
      QueueUrl: this.url,
    })
  }

  public async send(payload: P, options?: SendQueueOptions): Promise<void> {
    await sendMessage(this.client, {
      QueueUrl: this.url,
      MessageBody: JSON.stringify(payload),
      DelaySeconds: (options && options.delay) ? Math.max(Math.floor(options.delay / 1000), 900) : void 0,
    })
  }

  public async receive(): Promise<SqsJob<P> | undefined> {
    const messages = await receiveMessages(this.client, {
      QueueUrl: this.url,
      MaxNumberOfMessages: 1,
    })
    if (!messages.length) {
      return
    }
    const message = messages[0]

    return new SqsJob(this.url, message.ReceiptHandle as string, this, JSON.parse(message.Body as string))
  }

  public delete(job: SqsJob<P>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.deleteMessage({
        QueueUrl: job.url,
        ReceiptHandle: job.id,
      }, (err) => {
        if (err) {
          reject(err)
          return
        }
        job.isDeleted = true
        resolve()
      })
    })
  }
}
