import { EventEmitter } from 'events'
import EventEmitterEnhancer from 'event-emitter-enhancer'
import { Browser, CDPSession, Page } from 'puppeteer-core'
import Clipboard from './clipboard'

const EnhancedEventEmitter: any = EventEmitterEnhancer.extend(EventEmitter)

export default class BrowserPage extends EnhancedEventEmitter {
  private client: CDPSession
  private browser: Browser
  private clipboard: Clipboard
  public page: Page

  constructor(browser: Browser) {
    super()
    this.browser = browser
    this.clipboard = new Clipboard()
  }

  public dispose() {
    this.removeAllElseListeners()
    this.removeAllListeners()
    this.client.detach()
    this.page.close()
  }

  public async send(action: string, data: object = {}, callbackId?: number) {
    // console.log('► browserPage.send', action)

    switch (action) {
      case 'Page.goForward':
        await this.page.goForward()
        break
      case 'Page.goBackward':
        await this.page.goBack()
        break
      case 'Clipboard.readText':
        this.clipboard.readText().then(
          (result: any) => {
            this.emit({
              callbackId,
              result,
            })
          },
          (err: any) => {
            this.emit({
              callbackId,
              error: err.message,
            })
          },
        )
        break
      case 'Clipboard.writeText':
        this.clipboard.writeText((data as any).value).then(
          (result: any) => {
            this.emit({
              callbackId,
              result,
            })
          },
          (err: any) => {
            this.emit({
              callbackId,
              error: err.message,
            })
          },
        )
        break
      default:
        this.client
          .send(action, data)
          .then((result: any) => {
            this.emit({
              callbackId,
              result,
            })
          })
          .catch((err: any) => {
            this.emit({
              callbackId,
              error: err.message,
            })
          })
    }
  }

  public async launch(): Promise<void> {
    this.page = await this.browser.newPage()
    this.client = await this.page.target().createCDPSession()

    // @ts-expect-error
    EventEmitterEnhancer.modifyInstance(this.client)

    // @ts-expect-error
    this.client.else((action: string, data: object) => {
      // console.log('◀ browserPage.received', action)
      this.emit({
        method: action,
        result: data,
      })
    })
  }
}
