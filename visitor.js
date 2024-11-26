let stack=[]
let log = false ? console.log : () => null
let doit = () => null

const rules = {
  Program({body}) {body.map(walk)},
  VariableDeclaration({kind,declarations}) {declarations.map(walk)},
  VariableDeclarator({id,init}) {walk(id);if(init)walk(init)},
  Identifier({start,name}) {doit(name); log(start,name)},
  CallExpression({callee}) {walk(callee); arguments[0]['arguments'].map(walk)},
  NewExpression({callee}) {walk(callee); arguments[0]['arguments'].map(walk)},
  FunctionExpression({params,body}) {params.map(walk); walk(body)},
  MemberExpression({object,property}) {walk(object); walk(property)},
  ObjectPattern({properties}) {properties.map(walk)},
  ExpressionStatement({expression}) {walk(expression)},
  IfStatement({test,consequent}) {walk(test); walk(consequent)},
  BlockStatement({body}) {body.map(walk)},
  ReturnStatement({argument}) {if(argument)walk(argument)},

  Literal({start,value,raw}) {log(start,raw)},
  AssignmentExpression({operator,left,right}) {log(operator);walk(left);walk(right)},
  LogicalExpression({operator,left,right}) {log(operator);walk(left);walk(right)},
  BinaryExpression({operator,left,right}) {log(operator);walk(left);walk(right)},
  UnaryExpression({operator,prefix,argument}) {log(prefix?'prefix':'suffix',operator); walk(argument)},
  UpdateExpression({operator,prefix,argument}) {log(prefix?'prefix':'suffix',operator); walk(argument)},
  ObjectExpression({properties}) {properties.map(walk)},
  Property({key,value}) {walk(key);walk(value)},
  ArrayExpression({elements}) {elements.map(walk)},
  ArrayPattern({elements}) {elements.map(walk)},
  ArrowFunctionExpression({params,body}) {params.map(walk);walk(body)},
  TemplateLiteral({expressions,quasis}) {quasis.map(walk);expressions.map(walk)},
  TemplateElement({start,end}) {log(end-start,'bytes')},

  ForStatement({init,test,update,body}) {walk(init);walk(test);walk(update);walk(body)},
  ForInStatement({left,right,body}) {walk(left); walk(right); walk(body)},
  ForOfStatement({left,right,body}) {walk(left); walk(right); walk(body)},
  ChainExpression({expression}) {walk(expression)},
  ConditionalExpression({test,consequent,alternative}) {walk(test);walk(consequent);walk(alternative)},
  ContinueStatement(){},
  BreakStatement(){},

  AssignmentPattern({left,right}) {walk(left);walk(right)},
  WhileStatement({test,body}) {walk(test);walk(body)},
  TryStatement({block,handler,finalizer}) {walk(block);walk(handler);walk(finalizer)},
  CatchClause({param,body}) {walk(param);walk(body)},

  EmptyStatement() {},
  AwaitExpression({argument}) {walk(argument)},
  ThrowStatement({argument}) {walk(argument)},
  SwitchStatement({discriminant,cases}) {walk(discriminant); cases.map(walk)},
  SwitchCase({test,consequent}) {walk(test); consequent.map(walk)},
  RestElement({argument}) {walk(argument)},
  ImportExpression({source}) {walk(source)},
  FunctionDeclaration({id,params,body}) {walk(id),params.map(walk),walk(body)},

  ThisExpression({context}) {walk(context)},

  DoWhileStatement({test,body}) {walk(test);walk(body)},
  SequenceExpression({expressions}) {expressions.map(walk)},

  SpreadElement({argument}) {walk(argument)},
}

let each = (branch,stack) => {}
function wander(mods,doit) {
  each = doit
  for (const mod of mods) {
    stack = [mod.file]
    walk(mod.tree)
  }
  each = (branch,stack) => {}
}
function walk(branch) {
  if(branch) {
    const type = branch?.type;
    stack.unshift(branch); 
    log('PARSING',type);
    each(branch,stack);
    (rules[type]||fail)(branch);
    stack.shift()
  }
}
function fail(branch) {
  console.log('FAIL',branch)
}

module.exports = {wander}