let express = require('express')
let acorn = require('acorn')
let fs = require('fs')
// let fs = require('node:fs/promises');

let visitor = require('./visitor.js')
let dir = '../wiki-client/lib'
let mods = []

const app = express()


// P A G E S

app.get('/index', async (req,res,next) => {
  console.log(new Date().toLocaleTimeString(), 'index')
  const reductions = counter()
  fs.readdir(dir, async (err, files) => {
    mods = await Promise.all(files.map(load))
    const doit = branch => {reductions.count(branch.type)}
    visitor.wander(mods,doit)
    const result = `
      <p>${reductions.size()} non-terminals
      <br>${reductions.total()} reductions
      <p>${reductions.tally()
        .map(([k,v]) => `${v} ${link(k)}`)
        .join("<br>")}`
    res.send(result);
    next()
  })
})

async function load(file) {
  return new Promise(resolve => {
    fs.readFile(`${dir}/${file}`, "utf8", (err,text) => {
      const tree = acorn.parse(text, {ecmaVersion: "latest"})
      resolve({file,text,tree})
    })
  })
}

function link(key) {
  if(key.match(/^Ident/)) return `<a href="/terminal?type=${key}&field=name">${key}</a>`
  if(key.match(/^(As|B|L|U).*Ex/)) return `<a href="/terminal?type=${key}&field=operator">${key}</a>`
  if(key.match(/^Lit/)) return `<a href="/terminal?type=${key}&field=value">${key}</a>`
  return key
}


app.get('/terminal', (req,res) => {
  const lits = counter()
  const id = req.query.type
  const field = req.query.field
  const doit = branch => {if(branch.type==id) lits.count(branch[field])}
  visitor.wander(mods,doit)
  const result = `
    <p>${lits.size()} uniques
    <br>${lits.total()} total
    <p>${lits.tally()
      .map(([k,v]) => `${v} <a href="/usage?type=${id}&field=${field}&key=${encodeURIComponent(k)}">${escape(k)}</a>`)
      .join("<br>")}`
  res.send(result)
})

app.get('/usage', (req,res) => {
  const type = req.query.type
  const field = req.query.field
  const key = req.query.key
  const list = []
  const doit = (branch,stack) => {
    if(branch.type==type && branch[field]==key)
      list.push(`${stack.at(-1)} ${sxpr(stack[2],3)}`
        // `${stack.length}
        // ${stack.at(-1)}-${branch.start}-${branch.end}
        // (${stack.slice(0,6).map(n => n.end-n.start).join(" ")})`
        )
  }
  visitor.wander(mods,doit)
  res.send(`<pre>${JSON.stringify(req.query,null,2)}</pre>${list.join("<br>")}`)
})


// H E L P E R S

function counter() {
  const counts = new Map()
  return {
    count(item) {
      if(counts.has(item))
        counts.set(item, counts.get(item)+1)
      else 
        counts.set(item,1)
    },
    size() {
      return counts.size
    },
    total() {
      return [...counts]
        .reduce((sum,each) => sum + each[1], 0)
    },
    tally() {
      return [...counts]
        .sort((a,b) => a[1]==b[1] ? (a[0]>b[0] ? 1 : -1) : b[1]-a[1])
    },
  }
}

function escape(text) {
  try {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*(.+?)\*/g, '<i>$1</i>')
  } catch (e) {
    return text
  }
}

function sxpr(obj,deep,key,child) {
  const hilite = obj===child ? 'class="hi"' : ''
  const link = word => obj.type == 'Identifier' ? `<a href=/context?id=${word}>${word}</a>` : word
  if (obj) {
    if(deep) {
      const fields = Object.entries(obj)
        .filter(([k,v]) => !['start','end','raw','computed','optional','kind'].includes(k))
        .map(([k,v]) =>
          k=='type' ? abv(v) :
          (typeof v == 'string') ? link(expand(v)) :
          Array.isArray(v) ? `[${v.map(o => sxpr(o,deep-1,k,child)).join(" ")}]` :
          sxpr(v, deep-1, k, child))
        .join(" ")
      return key ? `<span ${hilite} title=${key}>(${(fields)})</span>` : `(${(fields)})`
    } else return elipsis(obj)
  } else return `<span title=${obj}>.</span>`
}

function abv(type) {
  return `<span title=${type}>${type.replaceAll(/[a-z]/g,'')}</span>`
}

function omit(k,v) {
  return k=='type'?v:k=='start'||k=='end'?undefined:v
}

function elipsis(obj) {
  const bytes = (obj.end||0)-(obj.start||0)
  const dots = '..' + '.'.repeat(Math.floor(Math.log2(bytes||1)))
  return `(<span title="${bytes} bytes">${dots}</span>)`
}

function expand(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
};

app.listen(1954)