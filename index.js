const express = require('express')
const acorn = require('acorn')
const fs = require('fs')
// const fs = require('node:fs/promises');
const visitor = require('./visitor.js')

const dir = '../wiki-client/lib'
const mods = []
fs.readdir(dir, async (err, files) => {
  mods.push(... await Promise.all(files.map(load)))
})

async function load(file) {
  return new Promise(resolve => {
    fs.readFile(`${dir}/${file}`, "utf8", (err,text) => {
      const tree = acorn.parse(text, {ecmaVersion: "latest"})
      resolve({file,text,tree})
    })
  })
}


// P A G E S

const style = (title,here='') => `
  <style>
    body {font-family:sans-serif;}
    a {text-decoration:none;}
    td:first-child {text-align:right;}
    .hi {background-color:pink;}
    section {letter-spacing:.2rem; font-size:1.2rem;}
   </style>
   <section>— ${title} <span style="background-color:#ddd;">&nbsp;${escape(here)}&nbsp;</span> —</section>`
const app = express()

app.get('/index', async (req,res,next) => {
  console.log(new Date().toLocaleTimeString(), 'index')
  const reductions = counter()
  const doit = branch => {reductions.count(branch.type)}
  visitor.wander(mods,doit)
  const result = `
    <p>${reductions.size()} non-terminals
    <br>${reductions.total()} reductions
    <p><table>${reductions.tally()
      .map(([k,v]) => `<tr><td>${v}<td>${link(k)}`)
      .join("\n")}</table>`
  res.send(style('index')+result);
  next()
  })

function link(key) {
  if(key.match(/^Ident/)) return `<a href="/terminal?type=${key}&field=name">${key}</a>`
  if(key.match(/^(As|B|L|U).*Ex/)) return `<a href="/terminal?type=${key}&field=operator">${key}</a>`
  if(key.match(/^Lit/)) return `<a href="/terminal?type=${key}&field=value">${key}</a>`
  return key
}

app.get('/terminal', (req,res) => {
  const {type,field} = req.query
  const lits = counter()
  const doit = branch => {if(branch.type==type) lits.count(branch[field])}
  visitor.wander(mods,doit)
  const result = style('terminal',type)+`
    <p>${lits.size()} uniques
    <br>${lits.total()} total
    <p><table>${lits.tally()
      .map(([k,v]) => `<tr><td>${v}<td><a href="/usage?type=${type}&field=${field}&key=${encodeURIComponent(k)}&width=2&depth=3">${escape(k)}</a>`)
      .join("\n")}</table>`
  res.send(result)
})

app.get('/usage', (req,res) => {
  const {type,field,key,width,depth} = req.query
  const list = []
  const files = counter()
  const doit = (branch,stack) => {
    if(branch.type==type && branch[field]==key)list.push(`
      <tr><td><a href="/nesting/?file=${files.count(stack.at(-1))}&type=${type}&start=${branch.start}&end=${branch.end}">
      ${stack.at(-1)}</a>
      <td>${sxpr(stack[width ?? 2], depth ?? 3)}`)
  }
  visitor.wander(mods,doit)
  const vis = row => row.split(/\n/)[3].trim().replaceAll(/<.*?>/g,'').replaceAll(/\.\.+/g,'..')
  list.sort((a,b) => vis(a)>vis(b) ? 1 : -1)
  const q = (id,delta) => Object.entries(req.query)
    .map(([k,v]) => k == id ? `${k}=${+v+delta}` : `${k}=${v}`)
    .join('&')
  const p = id => `<a href=/usage?${q(id,+1)} style="background-color:#ddd;">&nbsp;&plus;&nbsp;</a>`
  const m = id => `<a href=/usage?${q(id,-1)} style="background-color:#ddd;">&nbsp;&minus;&nbsp;</a>`
  const d = id => `<span title=${req.query[id]}>${id} ${p(id)} ${m(id)}</span>`
  res.send(style('usage',key)+`
    <p><table>${files.tally().map(([k,v]) => `<tr><td>${v}<td>${k}`).join("\n")}</table>
    <p><section>— ${d('width')} ${d('depth')} —</section>
    <p><table>${list.join("\n")}</table>`)
})

app.get('/nesting', (req,res) => {
  const {file,type,start,end} = req.query
  const result = []
  const doit = (branch,stack) => {
    if(stack.at(-1)==file && branch.type==type && branch.start==start && branch.end==end) {
      const file = stack.at(-1)
      const path = stack.slice(0,-1).map((n,i) => `
        <tr>
        <td><a title=${file} href=/similar?pos=${`${file}-${start}-${end}`}&depth=${i}>${n.type}</a>:
        <td>${sxpr(n,3,null,stack[i-1])}`).reverse()
      const hit = stack[1]
      result.push(`
        <p><table>${path.join("")}</table><br>
        <p><pre>${escape(JSON.stringify(hit,omit,2))}</pre>`)
    }
  }
  visitor.wander(mods,doit)
  res.send(style('nesting')+`${result.join("<hr>")}`)
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
      return item
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
  const link = word => obj.type == 'Identifier' ? `<a href=/usage?type=Identifier&field=name&key=${word}>${word}</a>` : word
  if (obj) {
    if(deep) {
      const fields = Object.entries(obj)
        .filter(([k,v]) => !['start','end','raw','computed','optional','kind'].includes(k))
        .map(([k,v]) =>
          k=='type' ? abv(v) :
          (typeof v == 'string') ? link(escape(v)) :
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

app.listen(1954)