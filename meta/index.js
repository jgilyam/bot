/**
 * NO TOCAR ESTE ARCHIVO: Es generado automaticamente, si sabes lo que haces adelante ;)
 * de lo contrario mejor ir a la documentacion o al servidor de discord link.codigoencasa.com/DISCORD
 */
"use strict";

var require$$0$1 = require("@bot-whatsapp/bot");
var require$$1$1 = require("axios");
var require$$0 = require("node:events");
var require$$1 = require("polka");
var require$$2 = require("body-parser");

const { EventEmitter } = require$$0;
const polka = require$$1;
const { urlencoded, json } = require$$2;

let MetaWebHookServer$1 = class MetaWebHookServer extends EventEmitter {
  metaServer;
  metaPort;
  token;
  constructor(_token, _metaPort) {
    super();
    this.metaServer = polka();
    this.metaPort = _metaPort;
    this.token = _token;

    this.buildHTTPServer();
  }

  /**
   * Mensaje entrante
   * emit: 'message'
   * @param {*} req
   * @param {*} res
   */
  incomingMsg = (req, res) => {
    const { body } = req;

    const messages = body.entry[0].changes[0].value?.messages;

    if (!messages) return;

    const [message] = messages;
    const to = body.entry[0].changes[0].value.metadata.display_phone_number;

    this.emit("message", {
      from: message.from,
      to,
      body: message.text?.body,
    });
    const json = JSON.stringify({ body });
    res.end(json);
  };

  /**
   * Valida el token
   * @alpha
   * @param {string} mode
   * @param {string} token
   * @example  tokenIsValid('subscribe', 'MYTOKEN')
   */
  tokenIsValid(mode, token) {
    return mode === "subscribe" && this.token === token;
  }

  /**
   * Verificación del token
   * @param {*} req
   * @param {*} res
   */
  verifyToken = (req, res) => {
    const { query } = req;
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (!mode || !token) {
      return (res.statusCode = 403), res.end("No token!");
    }

    if (this.tokenIsValid(mode, token)) {
      console.log("Webhook verified--->😎😎😎😎");
      return (res.statusCode = 200), res.end(challenge);
    }

    if (!this.tokenIsValid(mode, token)) {
      return (res.statusCode = 403), res.end("No token!");
    }
  };

  /**
   * Contruir HTTP Server
   * @returns
   */
  buildHTTPServer = () => {
    this.metaServer
      .use(urlencoded({ extended: true }))
      .get("/webhook", this.verifyToken);

    this.metaServer
      .use(urlencoded({ extended: true }))
      .use(json())
      .post("/webhook", this.incomingMsg);
  };

  /**
   * Puerto del HTTP
   * @param {*} port default 3000
   */
  start = () => {
    this.metaServer.listen(this.metaPort, () => {
      console.log(``);
      console.log(`[meta]: Agregar esta url "Hola Hola"`);
      console.log(`[meta]: POST http://localhost:${this.metaPort}/webhook`);
      console.log(`[meta]: Más información en la documentacion`);
      console.log(``);
    });
    this.emit("ready");
  };
};

var server = MetaWebHookServer$1;

const { ProviderClass } = require$$0$1;
const axios = require("axios");
const { AxiosError } = require("axios");
const MetaWebHookServer = server;
const URL = `https://graph.facebook.com/v15.0`;

/**
 * ⚙️MetaProvider: Es un provedor que te ofrece enviar
 * mensaje a Whatsapp via API
 * info: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 *
 *
 * Necesitas las siguientes tokens y valores
 * { jwtToken, numberId, vendorNumber, verifyToken }
 */
const PORT = process.env.PORT || 3000;

class MetaProvider extends ProviderClass {
  metHook;
  jwtToken;
  numberId;
  apiWhatsappClient;
  constructor({ jwtToken, numberId, verifyToken, port = PORT }) {
    super();
    this.jwtToken = jwtToken;
    this.numberId = numberId;
    this.metHook = new MetaWebHookServer(verifyToken, port);
    this.metHook.start();
    this.apiWhatsappClient = axios.create({
      baseURL: `https://graph.facebook.com/v15.0/${this.numberId}`,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.jwtToken}`,
      },
    });
    console.log(`axios: ${this.apiWhatsappClient}`);
    const listEvents = this.busEvents();

    for (const { event, func } of listEvents) {
      this.metHook.on(event, func);
    }
  }

  /**
   * Mapeamos los eventos nativos a los que la clase Provider espera
   * para tener un standar de eventos
   * @returns
   */
  busEvents = () => [
    {
      event: "auth_failure",
      func: (payload) => this.emit("error", payload),
    },
    {
      event: "ready",
      func: () => this.emit("ready", true),
    },
    {
      event: "message",
      func: (payload) => {
        this.emit("message", payload);
      },
    },
  ];

  sendMessageMeta = async (body) => {
    try {
      const response = await this.apiWhatsappClient.post(`/messages`, body);
      return response.data;
    } catch (error) {
      console.log(`Error intentando hacer post con axios: ${error.toJSON()}`);
      const promiseError = Promise.resolve(error);
      return promiseError;
    }
  };

  sendtext = async (number, message) => {
    const numberString = new String(number);

    const numberProcessed = numberString.slice(0, 2) + numberString.slice(3);

    const body = {
      messaging_product: "whatsapp",
      to: numberProcessed,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    };

    await this.sendMessageMeta(body);
  };

  sendMedia = async (number, _, mediaInput = null) => {
    if (!mediaInput) throw new Error(`MEDIA_INPUT_NULL_: ${mediaInput}`);
    const body = {
      messaging_product: "whatsapp",
      to: number,
      type: "image",
      image: {
        link: mediaInput,
      },
    };
    await this.sendMessageMeta(body);
  };

  /**
   *
   * @param {*} userId
   * @param {*} message
   * @param {*} param2
   * @returns
   */
  sendMessage = async (number, message, { options }) => {
    if (options?.buttons?.length)
      return this.emit("notice", "Envio de botones");
    if (options?.media) return this.sendMedia(number, message, options.media);

    this.sendtext(number, message);
  };
}

var meta = MetaProvider;

module.exports = meta;
