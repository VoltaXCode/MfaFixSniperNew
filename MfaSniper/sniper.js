"use strict";
const tls = require("tls");
const WebSocket = require("ws");
const extractJsonFromString = require("extract-json-from-string");
const http2 = require("http2");

let vanity;
let mfaToken = "";
const guilds = {};

const token = "token gir";
const server = "url sw";
const password = "tokenin şifre";

const tlsSocket = tls.connect({
    host: "canary.discord.com",
    port: 443,
});

tlsSocket.on('data', (data) => {
    const ext = extractJsonFromString(data.toString());
    const find = ext.find((e) => e.code) || ext.find((e) => e.message);

    if (find) {
        console.log(find);
        const requestBody = JSON.stringify({
            content: `||@everyone||`,
            embeds: [
                {
                    fields: [
                        {
                            name: "Vanity",
                            value: `\`\`\`${vanity}\`\`\``,
                            inline: false
                        },
                        {
                            name: "Code",
                            value: `\`\`\`${JSON.stringify(find)}\`\`\``,
                            inline: false
                        }
                    ]
                }
            ]
        });
        sendWebhook(requestBody);
        vanity = `${find}`;
    }
});

async function sendWebhook(requestBody) {
    try {
        const webhookPath = "webhook gir ama /api/webhooks/'dan sonrasını yaz başını girme";

        const client = http2.connect("https://discord.com");

        const req = client.request({
            ":method": "POST",
            ":path": webhookPath,
            "Content-Type": "application/json",
            ...commonHeaders,
        });

        let data = "";

        req.on("response", (headers, flags) => {
            req.on("data", (chunk) => {
                data += chunk;
            });

            req.on("end", () => {
                console.log("Webhook Response:", data);
                client.close();
            });
        });

        req.on("error", (err) => {
            console.error("Webhook Error:", err);
            client.close();
        });

        req.write(requestBody);
        req.end();
    } catch (error) {
        console.error("Error sending webhook:", error);
    }
}

tlsSocket.on("error", (error) => {
    console.log("-> TLS Connection Error <-", error);
    return process.exit();
});

tlsSocket.on("end", () => {
    console.log("-> TLS Connection Lost <-");
    return process.exit();
});

const commonHeaders = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) nosniff/1.0.9164 Chrome/124.0.6367.243 Electron/30.2.0 Safari/537.36",
    Authorization: token,
    "Content-Type": "application/json",
    "X-Super-Properties":
        "eyJvcyI6IkFuZHJvaWQiLCJicm93c2VyIjoiQW5kcm9pZCBDaHJvbWUiLCJkZXZpY2UiOiJBbmRyb2lkIiwic3lzdGVtX2xvY2FsZSI6InRyLVRSIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKExpbnV4OyBBbmRyb2lkIDYuMDsgTmV4dXMgNSBCdWlsZC9NUkE1OE4pIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMzEuMC4wLjAgTW9iaWxlIFNhZmFyaS81MzcuMzYiLCJicm93c2VyX3ZlcnNpb24iOiIxMzEuMC4wLjAiLCJvc192ZXJzaW9uIjoiNi4wIiwicmVmZXJyZXIiOiJodHRwczovL2Rpc2NvcmQuY29tL2NoYW5uZWxzL0BtZS8xMzAzMDQ1MDIyNjQzNTIzNjU1IiwicmVmZXJyaW5nX2RvbWFpbiI6ImRpc2NvcmQuY29tIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjM1NTYyNCwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbCwiaGFzX2NsaWVudF9tb2RzIjpmYWxzZX0=",
};

tlsSocket.on("secureConnect", () => {
    const websocket = new WebSocket("wss://gateway.discord.gg");

    websocket.onclose = (event) => {
        console.log("WS Closed");
        return process.exit();
    };

    websocket.onmessage = async (message) => {
        const { d, op, t } = JSON.parse(message.data);

        if (t === "GUILD_UPDATE") {
            const find = guilds[d.guild_id];
            if (find) {
                const requestBody = JSON.stringify({ code: find });
                tlsSocket.write([
                    `PATCH /api/v10/guilds/${server}/vanity-url HTTP/1.1`,
                    'Host: canary.discord.com',
                    'Content-Type: application/json',
                    'X-Discord-MFA-Authorization: ' + mfaToken,
                    'Cookie: __Secure-recent_mfa=' + mfaToken,
                    `Content-Length: ${Buffer.byteLength(requestBody)}`,
                    ...Object.entries(commonHeaders).map(([key, value]) => `${key}: ${value}`),
                    '',
                    requestBody
                ].join('\r\n'));
                vanity = `${find}`;
            }
          }    
        else if (t === "READY") {
            d.guilds.forEach((guild) => {
                if (guild.vanity_url_code) {
                    guilds[guild.id] = guild.vanity_url_code;
                }
            });
            console.log(guilds);
        }

        if (op === 10) {
            websocket.send(JSON.stringify({
                op: 2,
                d: {
                    token: token,
                    intents: 513 << 0,
                    properties: {
                        os: "Linux",
                        browser: "FireFox",
                        device: "FireFox",
                    },
                },
            }));
            setInterval(() => websocket.send(JSON.stringify({ op: 1, d: {}, s: null, t: "heartbeat" })), d.heartbeat_interval);
        }
    };

    setInterval(() => {
        tlsSocket.write(["GET / HTTP/1.1", "Host: canary.discord.com", "", ""].join("\r\n"));
    }, 690);
}); 

async function ticket() {
    try {
        const initialResponse = await http2Request("PATCH", `/api/v10/guilds/0/vanity-url`, commonHeaders);
        const data = JSON.parse(initialResponse);

        if (data.code === 200) {
            console.log("Success");
        } else if (data.code === 60003) {
            const ticket = data.mfa.ticket;
            await mfa(ticket);
        } else {
            console.log("Error:", data.code);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

async function mfa(ticket) {
    try {
        const mfaResponse = await http2Request(
            "POST",
            "/api/v10/mfa/finish",
            commonHeaders,
            JSON.stringify({
                ticket: ticket,
                mfa_type: "password",
                data: password,
            })
        );

        const responseData = JSON.parse(mfaResponse);

        if (responseData.token) {
            mfaToken = responseData.token;
        } else {
            throw new Error(`Error: ${JSON.stringify(responseData)}`);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

async function http2Request(method, path, customHeaders = {}, body = null, retries = 3) {
    return new Promise((resolve, reject) => {
        const client = http2.connect("https://discord.com");

        const req = client.request({
            ":method": method,
            ":path": path,
            ...customHeaders,
        });

        let data = "";

        req.on("response", (headers, flags) => {
            req.on("data", (chunk) => {
                data += chunk;
            });

            req.on("end", () => {
                resolve(data);
                client.close();
            });
        });

        req.on("error", (err) => {
            if (retries > 0) {
                console.log("Error occurred, retrying...");
                return http2Request(method, path, customHeaders, body, retries - 1);
            }
            reject(err);
            client.close();
        });

        if (body) {
            req.write(body);
        }

        req.end();
    });
}

ticket();