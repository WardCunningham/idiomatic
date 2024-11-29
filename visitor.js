let stack=[]
let log = false ? console.log : () => null
let doit = () => null

const rules = {
  Program({body}) {body.map(step)},
  VariableDeclaration({kind,declarations}) {declarations.map(step)},
  VariableDeclarator({id,init}) {step(id);if(init)step(init)},
  Identifier({start,name}) {doit(name); log(start,name)},
  CallExpression({callee}) {step(callee); arguments[0]['arguments'].map(step)},
  NewExpression({callee}) {step(callee); arguments[0]['arguments'].map(step)},
  FunctionExpression({params,body}) {params.map(step); step(body)},
  MemberExpression({object,property}) {step(object); step(property)},
  ObjectPattern({properties}) {properties.map(step)},
  ExpressionStatement({expression}) {step(expression)},
  IfStatement({test,consequent}) {step(test); step(consequent)},
  BlockStatement({body}) {body.map(step)},
  ReturnStatement({argument}) {if(argument)step(argument)},

  Literal({start,value,raw}) {log(start,raw)},
  AssignmentExpression({operator,left,right}) {log(operator);step(left);step(right)},
  LogicalExpression({operator,left,right}) {log(operator);step(left);step(right)},
  BinaryExpression({operator,left,right}) {log(operator);step(left);step(right)},
  UnaryExpression({operator,prefix,argument}) {log(prefix?'prefix':'suffix',operator); step(argument)},
  UpdateExpression({operator,prefix,argument}) {log(prefix?'prefix':'suffix',operator); step(argument)},
  ObjectExpression({properties}) {properties.map(step)},
  Property({key,value}) {step(key);step(value)},
  ArrayExpression({elements}) {elements.map(step)},
  ArrayPattern({elements}) {elements.map(step)},
  ArrowFunctionExpression({params,body}) {params.map(step);step(body)},
  TemplateLiteral({expressions,quasis}) {quasis.map(step);expressions.map(step)},
  TemplateElement({start,end}) {log(end-start,'bytes')},

  ForStatement({init,test,update,body}) {step(init);step(test);step(update);step(body)},
  ForInStatement({left,right,body}) {step(left); step(right); step(body)},
  ForOfStatement({left,right,body}) {step(left); step(right); step(body)},
  ChainExpression({expression}) {step(expression)},
  ConditionalExpression({test,consequent,alternative}) {step(test);step(consequent);step(alternative)},
  ContinueStatement(){},
  BreakStatement(){},

  AssignmentPattern({left,right}) {step(left);step(right)},
  WhileStatement({test,body}) {step(test);step(body)},
  TryStatement({block,handler,finalizer}) {step(block);step(handler);step(finalizer)},
  CatchClause({param,body}) {step(param);step(body)},

  EmptyStatement() {},
  AwaitExpression({argument}) {step(argument)},
  ThrowStatement({argument}) {step(argument)},
  SwitchStatement({discriminant,cases}) {step(discriminant); cases.map(step)},
  SwitchCase({test,consequent}) {step(test); consequent.map(step)},
  RestElement({argument}) {step(argument)},
  ImportExpression({source}) {step(source)},
  FunctionDeclaration({id,params,body}) {step(id),params.map(step),step(body)},

  ThisExpression({context}) {step(context)},

  DoWhileStatement({test,body}) {step(test);step(body)},
  SequenceExpression({expressions}) {expressions.map(step)},

  SpreadElement({argument}) {step(argument)},
}

let each = (branch,stack) => {}
function walk(mods,doit) {
  each = doit
  for (const mod of mods) {
    stack = [mod.file]
    step(mod.tree)
  }
  each = (branch,stack) => {}
}
function step(branch) {
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

module.exports = {walk}