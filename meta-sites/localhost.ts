const { stat } = Deno;
import * as wiki from "seran/wiki.ts";
import { Request } from "seran/wiki.ts";
import { System, MetaSite } from "seran/system.ts";

export let plugins = ["/client/wander.mjs", "/client/turtle.mjs"]

async function readDir(path) {
  let fileInfo = await stat(path);
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readdir(path);
}

let metaPages = {};

// since constructors cannot be async and readDir is async, use an init method
export async function init({site, system}: {site: MetaSite, system: System}) {
  wiki.enableLogin(site, system)
  for (let metaPagePath of await readDir("./meta-pages")) {
    let metaPage = await import(`../meta-pages/${metaPagePath.name}`);
    let exports = Object.keys(metaPage);
    if (exports.length > 1) {
      console.log(
        `Warning: Only registering first export of ${metaPagePath.name}`
      );
    } else if (exports.length == 0) {
      console.log(
        `Warning: Unable to register meta-page for ${metaPagePath.name}`
      );
      continue;
    }
    metaPages[`/${metaPagePath.name.replace(/\.[tj]s$/, "")}.json`] = metaPage
      [exports[0]];
  }
}

function wantsTurtleSave(req: Request) {
  return req.url.indexOf("/turtle/save") == 0;
}
let turtle = {
  saved: {
    history: [{"fn":"clear","beforestate":{},"state":{"name":"origin","x":0,"y":0,"direction":-1.5707963267948966,"pensize":1,"pencolor":"black","movesize":30,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6}},{"fn":"turn","beforestate":{"name":"origin","x":0,"y":0,"direction":-1.5707963267948966,"pensize":1,"pencolor":"black","movesize":30,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6},"state":{"name":"origin","x":0,"y":0,"direction":5.759586531581287,"pensize":1,"pencolor":"black","movesize":30,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6}},{"fn":"move","beforestate":{"name":"origin","x":0,"y":0,"direction":5.759586531581287,"pensize":1,"pencolor":"black","movesize":30,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6},"state":{"name":"origin","x":25.980762113533153,"y":-15.000000000000014,"direction":5.759586531581287,"pensize":1,"pencolor":"black","movesize":30,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6}},{"fn":"turn","beforestate":{"name":"origin","x":25.980762113533153,"y":-15.000000000000014,"direction":5.759586531581287,"pensize":1,"pencolor":"black","movesize":30,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6},"state":{"name":"origin","x":25.980762113533153,"y":-15.000000000000014,"direction":0.5235987755982983,"pensize":1,"pencolor":"black","movesize":30,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6}},{"fn":"nextMovesize","beforestate":{"name":"origin","x":25.980762113533153,"y":-15.000000000000014,"direction":0.5235987755982983,"pensize":1,"pencolor":"black","movesize":30,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6},"state":{"name":"origin","x":25.980762113533153,"y":-15.000000000000014,"direction":0.5235987755982983,"pensize":1,"pencolor":"black","movesize":35,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6}},{"fn":"move","beforestate":{"name":"origin","x":25.980762113533153,"y":-15.000000000000014,"direction":0.5235987755982983,"pensize":1,"pencolor":"black","movesize":35,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6},"state":{"name":"origin","x":56.29165124598852,"y":2.499999999999968,"direction":0.5235987755982983,"pensize":1,"pencolor":"black","movesize":35,"turnsize":1.0471975511965976,"turnsizeNumerator":1,"turnsizeDenominator":6}}]
  }
};
async function turtleSave(req: Request) {
  if (req.method != "POST") {
    // Different status code?
    wiki.serve404(req);
    return
  }
  // building a JSON blob from req.body.read 'cos I can't find a
  // higher-level API. but seems hard to believe I haven't missed
  // something obvious.
  // copied a bunch of this from deno's http server source:
  // https://github.com/denoland/deno/blob/bced52505f32d6cca4f944bb610a8a26767908a8/std/http/server.ts#L57-L66
  const buf = new Uint8Array(req.contentLength);
  let bufSlice = buf;
  let totRead = 0;
  while (true) {
    const nread = await req.body.read(bufSlice);
    if (nread === Deno.EOF) break;
    totRead += nread;
    if (totRead >= req.contentLength) break;
    bufSlice = bufSlice.subarray(nread);
  }
  let body = JSON.parse(String.fromCharCode(...buf))
  console.log({where: 'POST /turtle/save', id:body.id, historyLength:body.history.length});
  turtle[body.id] = body;
  wiki.serveJson(req, {success: true, ...body});
  return;
}

export async function serve(req: Request, system: System) {
  if (req.url == "/welcome-visitors.json") {
    wiki.serveJson(
      req,
      wiki.welcomePage("[[DenoWiki]]", "[[Admin]], [[Wander]], [[Deno Sites]]")
    );
  } else if (req.url == "/admin.json") {
    let items = [wiki.paragraph("Active meta-sites:")]
    for (let siteName of system.metaSitesInDomain(req)) {
      items.push(wiki.paragraph(`[http://${siteName}/view/welcome-visitors ${siteName}]`))
    }
    items.push(wiki.paragraph("Sites with passwords:"))
    let count = 0
    for (let site of Object.values(system.metaSites)) {
      if (site.secret) {
        count += 1
        items.push(wiki.paragraph(`${site.name}: ${site.secret}`))
      }
    }
    if (count == 0) {
      items.push(wiki.paragraph("None"))
    }
    let page = wiki.page("Admin", items)
    page.protected = true
    wiki.serveJson(
      req,
      page
    );
  } else if (req.url == "/wander.json") {
    wiki.serveJson(
      req,
      wiki.page("Wander", [
        wiki.item("turtle-wander", {}),
        wiki.item("turtle", turtle.saved)
      ])
    );
  } else if (metaPages[req.url]) {
    // These are meta-pages from the meta-pages folder
    console.log("calling:", metaPages[req.url]);
    let data = await metaPages[req.url](req, system);
    wiki.serveJson(req, data);
  } else if (wantsTurtleSave(req)) {
    return turtleSave(req)
  } // This will serve system urls
  else {
    wiki.serve(req, system);
  }
}
