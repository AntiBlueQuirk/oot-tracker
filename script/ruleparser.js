(function() {

//https://stackoverflow.com/questions/1787322/htmlspecialchars-equivalent-in-javascript/4835406#4835406
function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function RuleLexer()
{
	this.text = "";
	this.pos = 0;
	this.tstart = 0;
	this.cchar = null;
}
RuleLexer.prototype.load = function (text)
{
	this.text = text;
	this.pos = 0;
	this.tstart = 0;
	this.cchar = this.text[this.pos];
}
RuleLexer.prototype.seek = function (pos)
{
	this.pos = pos-1;
	this.advance();
}
RuleLexer.prototype.whitespace = [' ', '\t', '\r', '\n'];
RuleLexer.prototype.digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
RuleLexer.prototype.lower = [
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
	'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
	'u', 'v', 'w', 'x', 'y', 'z',
]
RuleLexer.prototype.upper = [
	'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
	'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
	'U', 'V', 'W', 'X', 'Y', 'Z',
];
RuleLexer.prototype.alpha = RuleLexer.prototype.lower.concat(RuleLexer.prototype.upper);
RuleLexer.prototype.name_start = ['_'].concat(RuleLexer.prototype.alpha);
RuleLexer.prototype.name = RuleLexer.prototype.name_start.concat(RuleLexer.prototype.digits);
RuleLexer.prototype.ops = ['(', ')', '[', ']', ',', '<', '>', '==', '>=', '<=', '<>', '!=']; //supports 1 and 2 char ops
RuleLexer.prototype.nameops = ['if', 'else', 'and', 'or', 'not', 'is', 'in', 'True', 'False']; //supports ops that would count as names otherwise
RuleLexer.prototype.advance = function ()
{
	this.pos++;
	if (this.pos >= this.text.length)
		this.cchar = null;
	else
		this.cchar = this.text[this.pos];
}
RuleLexer.prototype.peek = function()
{
    var peek_to = this.pos + 1;
    if (peek_to >= this.text.length)
        return null
    else
        return this.text[peek_to];
}
RuleLexer.prototype.skip_whitespace = function ()
{
	while (this.cchar !== null && this.whitespace.includes(this.cchar))
		this.advance();
}
RuleLexer.prototype.get_integer = function ()
{
	var res = '';
	while (this.cchar !== null && this.digits.includes(this.cchar))
	{
		res += this.cchar;
		this.advance();
	}
	return parseInt(res);
}
RuleLexer.prototype.get_string = function ()
{
	var first = this.cchar;
	this.advance();
	
	var res = '';
	//this is extremely poor string parsing. It doesn't handle escape characters at all.
	while (this.cchar !== null && this.cchar != first)
	{
		res += this.cchar;
		this.advance();
	}
	//this.cchar should equal first now
	this.advance();
	return res;
}
RuleLexer.prototype.get_name = function ()
{
	var res = '';
	while (this.cchar !== null && (
		this.name_start.includes(this.cchar) ||
		(res.length > 0 && this.name.includes(this.cchar))
	))
	{
		res += this.cchar;
		this.advance();
	}
	return res;
}
RuleLexer.prototype.get_token = function ()
{
	while (this.cchar !== null)
	{
		if (this.whitespace.includes(this.cchar))
		{
			this.skip_whitespace();
			continue;
		}
		
		this.tstart = this.pos;
		
		if (this.digits.includes(this.cchar))
			return { type: "int", value: this.get_integer() };
		
		if (this.cchar == "'" || this.cchar == '"')
			return { type: "string", value: this.get_string() };
		
		var cpeek = this.cchar + (this.peek() || ' ');
		
		if (this.ops.includes(cpeek))
		{
			var op = cpeek;
			this.advance();
			this.advance();
			return { type: "op", value: op };
		}
		
		if (this.ops.includes(this.cchar))
		{
			var op = this.cchar;
			this.advance();
			return { type: "op", value: op };
		}
		
		
		
		if (this.name_start.includes(this.cchar))
		{
			var name = this.get_name();
			if (this.nameops.includes(name))
				return { type: "op", value: name };
			return { type: "name", value: name };
		}
		
		throw "Unrecognized character "+this.cchar;
	}
	
	return { type: "eof" }
}

//Parses a set of rules into an AST. The grammar is based on simplified Python.
//https://docs.python.org/3/reference/grammar.html
//I have no illusions that I'm any good at writing parsers, so expect this to be
//full of bugs.
function RuleParser(world)
{
	this.lexer = new RuleLexer();
	this.ctok = null;
	this.stack = null;
	this.errors = null;
	this.world = world;
}
RuleParser.prototype.save = function()
{
	this.stack.push(this.lexer.tstart);
	return true;
}
RuleParser.prototype.unsave = function()
{
	this.stack.pop();
	return true;
}
RuleParser.prototype.restore = function()
{
	if (this.stack.length == 0)
		throw "Attempt to restore from empty stack";
	
	var pos = this.stack[this.stack.length-1];
	this.lexer.seek(pos);
	this.ctok = this.lexer.get_token();
	return true;
}
RuleParser.prototype.error = function(msg)
{
	this.errors.push(msg);
	return false;
}
RuleParser.prototype.eat_token_any = function()
{
	var token = this.ctok;
	this.ctok = this.lexer.get_token();
	return token;
}
RuleParser.prototype.eat_token_type = function(type)
{
	var token = this.ctok;
	if (token && token.type == type)
	{
		this.ctok = this.lexer.get_token();
		return token;
	}
	else
		return false;
}
RuleParser.prototype.eat_token_op = function(op)
{
	var token = this.ctok;
	if (token && token.type == 'op' && token.value == op)
	{
		this.ctok = this.lexer.get_token();
		return token;
	}
	else
		return false;
}
RuleParser.prototype.nothing = function()
{
	return {type: "nothing"};
}
RuleParser.prototype.name = function()
{
	var token = this.ctok;
	if (token && token.type == 'name')
	{
		this.ctok = this.lexer.get_token();
		return { type: 'name', value: token.value };
	}
	else
		return false;
}
RuleParser.prototype.number = function()
{
	var token = this.ctok;
	if (token && token.type == 'int')
	{
		this.ctok = this.lexer.get_token();
		return { type: 'number', value: token.value };
	}
	else
		return false;
}
RuleParser.prototype.string = function()
{
	var token = this.ctok;
	if (token && token.type == 'string')
	{
		this.ctok = this.lexer.get_token();
		return { type: 'string', value: token.value };
	}
	else
		return false;
}
RuleParser.prototype.bool = function()
{
	
	if (this.eat_token_op('True'))
	{
		return { type: 'bool', value: true };
	}
	else if (this.eat_token_op('False'))
	{
		return { type: 'bool', value: false };
	}
	else
		return false;
}

//argument: ( test [comp_for] |
//            test '=' test |
//            '**' test |
//            '*' test )
//But we only support the first form now.
RuleParser.prototype.argument = function()
{
	return this.test();
}
//arglist: argument (',' argument)*  [',']
RuleParser.prototype.arglist = function()
{
	var args = [];
	
	do {
		this.save();
		
		var arg = this.argument();
		if (!arg)
		{
			this.restore();
			this.unsave();
			break;
		}
		else
		{
			this.unsave();
			args.push(arg);
		}
		
		if (!this.eat_token_op(','))
			break;
	} while (true);
	
	if (args.length > 0) return args;
	return false;
}

//trailer: '(' [arglist] ')' | '[' subscriptlist ']' | '.' NAME
//But we don't support slices, so we use arglist instead of subscriptlist
RuleParser.prototype.trailer = function()
{
	if (this.eat_token_op('('))
	{
		var res = this.arglist();
		if (!res)
			res = [];
		if (!this.eat_token_op(')'))
			return this.error("Expected paren to close '('")
		return { type: 'call', args: res };
	}
	else if (this.eat_token_op('['))
	{
		var res = this.arglist();
		if (!res)
			return this.error("Expected subscript");
		if (!this.eat_token_op(']'))
			return this.error("Expected bracket to close '['");
		return { type: 'subscript', subscript: res };
	}
	else if (this.eat_token_op('.'))
	{
		var res = this.name();
		if (!res)
			return this.error("Expected name");
		return { type: 'index', index: res };
	}
	else return false;
}
//testlist_comp: (test|star_expr) ( comp_for | (',' (test|star_expr))* [','] )
//But we don't support for .. in, so this reduces to testlist_star_expr
RuleParser.prototype.testlist_comp = function()
{
	return this.testlist_star_expr();
}

RuleParser.prototype.flattenTuple = function(expr, returnArr)
{
	if (expr && expr.type == 'op2' && expr.op == ',')
	{
		var left = this.flattenTuple(expr.left, true);
		var right = this.flattenTuple(expr.right, true);
		
		var parts = [];
		if (Array.isArray(left)) Array.prototype.push.apply(parts, left);
		else parts.push(left);
		if (Array.isArray(right)) Array.prototype.push.apply(parts, right);
		else parts.push(right);
		
		if (returnArr) return parts;
		else return { type: 'tuple', value: parts };
	}
	return expr;
}
//atom: ('(' [yield_expr|testlist_comp] ')' |
//       '[' [testlist_comp] ']' |
//       '{' [dictorsetmaker] '}' |
//       NAME | NUMBER | STRING+ | '...' | 'None' | 'True' | 'False')
//But we only support parts of this
RuleParser.prototype.atom = function()
{
	var res = null;
	
	if (this.eat_token_op('('))
	{
		res = this.flattenTuple(this.testlist_comp());
		if (res && !this.eat_token_op(')'))
			return this.error("Expected paren to close '('");
	}
	
	if (!res && this.eat_token_op('['))
	{
		res = this.testlist_comp();
		if (res && !this.eat_token_op(']'))
			return this.error("Expected bracket to close '['");
	}
	
	return res || this.name() || this.number() || this.string() || this.bool();
}
//atom_expr: ['await'] atom trailer*
//But we don't support await
RuleParser.prototype.atom_expr = function()
{
	var res = this.atom();
	
	while (true)
	{
		var trailer = (this.save() && this.trailer());
		if (trailer)
		{
			//trailer returns an incomplete op.
			trailer.target = res;
			trailer.target.callTarget = true;
			res = trailer;
		}
		else
		{
			this.restore();
			this.unsave();
			break;
		}
		
		this.unsave();
	}
	return res;
}

RuleParser.prototype.comp_op = function()
{
	this.save();
	var res = this.eat_token_op('not') && this.eat_token_op('in');
	if (res) {
		this.unsave();
		return { type: 'op', op: 'notin' };
	}
	this.restore();
	
	res = this.eat_token_op('is') && this.eat_token_op('not');
	if (res) {
		this.unsave();
		return { type: 'op', op: 'isnot' };
	}
	this.restore();
	
	res =
		this.eat_token_op('<') ||
		this.eat_token_op('>') ||
		this.eat_token_op('==') ||
		this.eat_token_op('>=') ||
		this.eat_token_op('<=') ||
		this.eat_token_op('<>') ||
		this.eat_token_op('!=') ||
		this.eat_token_op('in') ||
		this.eat_token_op('is');
	if (res) {
		this.unsave();
		return { type: 'op', op: res.value };
	}
	this.restore();
	this.unsave();
	return false;
}
//comparison: expr (comp_op expr)*
//we any arithmetic yet, so this is:
//comparison: atom_expr (comp_op atom_expr)*

RuleParser.prototype.comparison = function()
{
	var res = this.atom_expr();
	if (!res) return false;
	var op;
	while (op = this.comp_op())
	{
		var right = this.atom_expr();
		if (right)
			res = { type: 'op2', op: op.op, left: res, right: right };
		else
			return this.error("Expected expression");
	}
		
	return res;
}
//not_test: 'not' not_test | comparison
RuleParser.prototype.not_test = function()
{
	if (this.eat_token_op('not'))
	{
		var right = this.not_test();
		if (right)
			return { type: 'opL', op: 'not', right: right };
		else	
			return this.error("Expected expression");
	}
	else return this.comparison();
}
//and_test: not_test ('and' not_test)*
RuleParser.prototype.and_test = function()
{
	var res = this.not_test();
	if (!res) return false;
	while (this.eat_token_op('and'))
	{
		var right = this.not_test();
		if (right)
			res = { type: 'op2', op: 'and', left: res, right: right };
		else
			return this.error("Expected expression");
	}
		
	return res;
}
//or_test: and_test ('or' and_test)*
RuleParser.prototype.or_test = function()
{
	var res = this.and_test();
	if (!res) return false;
	while (this.eat_token_op('or'))
	{
		var right = this.and_test();
		if (right)
			res = { type: 'op2', op: 'or', left: res, right: right };
		else
			return this.error("Expected expression");
	}
	return res;
}
RuleParser.prototype.test = function()
{
	return this.or_test();
}
RuleParser.prototype.star = function()
{
	return false; //not supported yet
}
//testlist_star_expr: (test|star) (',' (test|star))* [',']
RuleParser.prototype.testlist_star_expr = function()
{
	var res = (this.save() && this.test()) || (this.restore() && this.star());
	this.unsave();
	if (!res) return res;
	if (this.eat_token_op(','))
	{
		var right = this.testlist_star_expr();
		if (right)
			res = {type: 'op2', op: ',', left: res, right: right};
		//it's okay to drop the ',' here.
	}
	return res;
}
// expr_stmt: testlist_star_expr
RuleParser.prototype.expr_stmt = function()
{
	var res = this.testlist_star_expr();
	return res;
}
RuleParser.prototype.parse = function(rule)
{
	this.lexer.load(rule);
	this.ctok = this.lexer.get_token();
	this.stack = [];
	this.errors = [];
	
	return this.expr_stmt();
}

function astResolve(obj, state, mode)
{
	if (mode === undefined)
		mode = "normal";
	
	if (typeof obj === 'function' && obj.ast)
		return astResolve(obj(state), state, mode); //this is not great
	
	if (Array.isArray(obj))
		return obj.map(v => astResolve(v, state, mode));
	
	if (obj && typeof obj === 'object' && 'unresolved' in obj)
	{
		var n = obj.unresolved;
		var ns = n.replace(/_/g, " ");
		var num = 1;
		if (state.remap && (n in state.remap))
		{
			n = state.remap[n]; ns = null;
			if (Array.isArray(n))
			{
				num = n[1];
				n = n[0];
			}
		}
		
		var ret = null;
		if (mode != "nameonly")
		{
			if (state.prog_items.hasOwnProperty(n))
				ret = state.has(n, num);
			else if (ns && state.prog_items.hasOwnProperty(ns))
				ret = state.has(ns, num);
			else if (state.auto_items.hasOwnProperty(n))
				ret = state.auto_items[n](state);
			else if (ns && state.auto_items.hasOwnProperty(ns))
				ret = state.auto_items[ns](state);
			else if (state.hasOwnProperty(n) || Object.getPrototypeOf(state).hasOwnProperty(n))
				ret = state[n];
			//else if (state.loc_acc.hasOwnProperty(n))
			//	ret = state.loc_acc[n];
			//else if (ns && state.loc_acc.hasOwnProperty(ns))
			//	ret = state.loc_acc[ns];
			else if (state.settings.hasOwnProperty(n))
				ret = state.settings[n];
		}
		
		//if (ret == null)
		//	throw "Attempt to access unknown name "+n;
		
		
		if (typeof ret === "function" && !obj.callTarget)
			ret = ret();
		
		//if (ret == null)
		//	console.warn("Attempt to access unknown name "+n);
		
		if (ret == null)
			ret = ns;
		
		return ret;
	}
	return obj;
}
function compilePartAST(ast, world)
{
	var astfl = { ast: true, astsrc: ast };
	var self;
	if (Array.isArray(ast))
	{
		ast = ast.map(v => compilePartAST(v, world));
		return self = Object.assign(function (state) { return self.result = ast; }, astfl);
	}
	
	if (ast.type == 'name')
		return self = Object.assign(function (state) { return self.result = { "unresolved": ast.value, "callTarget": !!ast.callTarget }; }, astfl);
	else if (ast.type == 'number')
		return self = Object.assign(function (state) { return self.result = ast.value; }, astfl);
	else if (ast.type == 'bool')
		return self = Object.assign(function (state) { return self.result = ast.value; }, astfl);
	else if (ast.type == 'string')
		return self = Object.assign(function (state) { return self.result = ast.value; }, astfl);
	else if (ast.type == 'op2')
	{
		var leftf = astfl.leftf = compilePartAST(ast.left, world);
		var rightf = astfl.rightf = compilePartAST(ast.right, world);
		
		if (ast.op == '==')
			return self = Object.assign(function (state) { leftf.result = rightf.result = undefined; return self.result = (astResolve(leftf(state), state) == astResolve(rightf(state), state)); }, astfl);
		else if (ast.op == '!=')
			return self = Object.assign(function (state) { leftf.result = rightf.result = undefined; return self.result = (astResolve(leftf(state), state) != astResolve(rightf(state), state)); }, astfl);
		else if (ast.op == '<=')
			return self = Object.assign(function (state) { leftf.result = rightf.result = undefined; return self.result = (astResolve(leftf(state), state) <= astResolve(rightf(state), state)); }, astfl);
		else if (ast.op == '>=')
			return self = Object.assign(function (state) { leftf.result = rightf.result = undefined; return self.result = (astResolve(leftf(state), state) >= astResolve(rightf(state), state)); }, astfl);
		else if (ast.op == 'and')
			return self = Object.assign(function (state) { leftf.result = rightf.result = undefined; return self.result = (astResolve(leftf(state), state) && astResolve(rightf(state), state)); }, astfl);
		else if (ast.op == 'or')
			return self = Object.assign(function (state) { leftf.result = rightf.result = undefined; return self.result = (astResolve(leftf(state), state) || astResolve(rightf(state), state)); }, astfl);
		else throw "I don't know what binary op this is: "+ast.op;
	}
	else if (ast.type == 'opL' || ast.type == 'opR')
	{
		var valf = astfl.valf = compilePartAST(ast.type == 'opL' ? ast.right : ast.left, world);
		if (ast.op == 'not')
			return self = Object.assign(function (state) { return self.result = !astResolve(valf(state), state); }, astfl);
		else throw "I don't know what unary op this is: "+ast.op;
	}
	else if (ast.type == 'call')
	{
		var targetf = astfl.targetf = compilePartAST(ast.target, world);
		var argsf = astfl.argsf = compilePartAST(ast.args, world)
		
		return self = Object.assign(function (state) {
			var rt = astResolve(targetf(state), state);
			var ra = astResolve(argsf(state), state, "nameonly");
			return self.result = rt.apply(null, ra);
		}, astfl);
	}
	else if (ast.type == 'subscript')
	{
		var targetf = astfl.targetf = compilePartAST(ast.target, world);
		var subscriptf = astfl.subscriptf = compilePartAST(ast.subscript, world);
		
		return self = Object.assign(function (state) {
			var rt = astResolve(targetf(state), state);
			var ra = astResolve(subscriptf(state), state)
			if (ra.length != 1) throw "Only subscripts of dimension 1 supported";
			return self.result = rt[ra];
		}, astfl);
	}
	else if (ast.type == 'index')
	{
		var targetf = astfl.targetf = compilePartAST(ast.target, world);
		var indexf = astfl.index = ast.index;//this should always be a name
		
		return Object.assign(function (state) {
			var rt = astResolve(targetf(state), state);
			var ri = astResolve(indexf(state), state, "nameonly");
			return self.result = rt[ri];
		}, astfl);
	}
	else if (ast.type == 'tuple')
	{
		//technically, this is correct, but the randomizer does silly things with tuples.
		//var value = compilePartAST(ast.value, world);
		//
		//return function (state) {
		//	var rv = astResolve(value, state);
		//	return rv; 
		//};
		if (ast.value.length != 2)
			throw "Rules Tuple must have 2 values";
		var item = ast.value[0];
		var count = ast.value[1];
		if (item.type !== 'name')
			throw "Rules Tuple first value must be name";
		if (count.type !== 'number' && count.type !== 'name')
			throw "Rules Tuple second value must be number or name";
		
		astfl.item = item;
		astfl.count = count;
		var countf = astfl.countf = compilePartAST(count);
		return self = Object.assign(function (state) {
			var rc = astResolve(countf(state), state);
			return self.result = state.has(item.value, rc); 
		}, astfl);
	}
	else
		throw "I don't know what this is: "+JSON.stringify(ast);
	
	return "WTF";
}
//Compiles an AST produced by RuleParser into a function of the form 'function (state) { ... }'
//The results of this function are defined by the AST. (Though under current rules, can only produce true or false)
function compileRuleAST(ast, world)
{
	var astfl = { ast: true, astsrc: ast, asttop: true };
	var self;
	
	ast = compilePartAST(ast, world);
	astfl.rulef = ast;
	return self = Object.assign(function (state) {
		var val = ast(state);
		val = astResolve(val, state);
		return self.result = val;
	}, astfl);
}
function toHTMLCompiledRule(rule, state)
{
	if (!rule.ast)
		throw "Not an AST compiled rule";
	
	if (rule.asttop)
		return toHTMLCompiledRule(rule.rulef, state);
	
	var ast = rule.astsrc;
	var result = rule.result && !!(rule.result.unresolved ? astResolve(rule.result, state) : rule.result);
	var res = null;
	
	if (ast.type == 'name')
		res = ast.value;
	else if (ast.type == 'number')
		return ast.value;
	else if (ast.type == 'bool')
		return ast.value;
	else if (ast.type == 'string')
		return "'"+ast.value+"'";
	else if (ast.type == 'op2')	
	{
		res = ' ('+toHTMLCompiledRule(rule.leftf, state) + ' ' + ast.op + ' ' + toHTMLCompiledRule(rule.rightf, state)+') ';
		var lres = rule.leftf.result;
		if (lres && lres.unresolved)
			lres = astResolve(lres, state);
		
		if (ast.op == 'and' && !lres)
			result = undefined;
	}
	else if (ast.type == 'opL')
		res = ast.op + ' ' + toHTMLCompiledRule(rule.rightf, state);
	else if (ast.type == 'call')
		res = toStringRuleAST(ast.target) + '(' + ast.args.map(a => toStringRuleAST(a)).join(', ') + ')';
	else if (ast.type == 'subscript')
		res = toStringRuleAST(ast.target) + '[' + ast.subscript.map(a => toStringRuleAST(a)).join(', ') + ']';
	else if (ast.type == 'index')
		res = toHTMLCompiledRule(rule.targetf, state) + '.' + toHTMLCompiledRule(ast.index, state);
	else if (ast.type == 'tuple')
		res = '(' + ast.value.map(a => toStringRuleAST(a)).join(', ') + ')';
	else
		throw "I don't know what this is: "+JSON.stringify(ast);
	
	var ruleclass = result == undefined ? 'ruleundef' : result ? 'ruletrue' : 'rulefalse';
	
	return '<span class="'+ruleclass+'">'+res+'</span>';
}
function isASTTrivialTrue(ast)
{
	return ast.type == 'bool' && ast.value == true;
}
function toStringRuleAST(ast, world)
{
	if (ast.type == 'name')
		return ast.value;
	else if (ast.type == 'number')
		return ast.value;
	else if (ast.type == 'bool')
		return ast.value;
	else if (ast.type == 'string')
		return "'"+ast.value+"'";
	else if (ast.type == 'op2')
		return toStringRuleAST(ast.left) + ' ' + ast.op + ' ' + toStringRuleAST(ast.right);
	else if (ast.type == 'opL')
		return ast.op + ' ' + toStringRuleAST(ast.right);
	else if (ast.type == 'call')
		return toStringRuleAST(ast.target) + '(' + ast.args.map(a => toStringRuleAST(a)).join(', ') + ')';
	else if (ast.type == 'subscript')
		return toStringRuleAST(ast.target) + '[' + ast.subscript.map(a => toStringRuleAST(a)).join(', ') + ']';
	else if (ast.type == 'index')
		return toStringRuleAST(ast.target) + '.' + toStringRuleAST(ast.index);
	else if (ast.type == 'tuple')
		return '(' + ast.value.map(a => toStringRuleAST(a)).join(', ') + ')';
	else
		throw "I don't know what this is: "+JSON.stringify(ast);
	
	return "WTF";
}
function parseRuleString(rule, world)
{
	if (!rule) return function (state) { return true; }
	
	rule = rule.split('#')[0];
	
	//Some optimization for our particular use case.
	if (rule == "True") return { type: "bool", value: true };
	if (rule == "False") return { type: "bool", value: false };
	
	var parser = new RuleParser(world);
	var ast = parser.parse(rule);
	if (!ast)
	{
		if (parser.errors.length>0)
			throw parser.errors[0];
		else
			throw "AST failed to parse";
	}
	return ast;//compileRuleAST(ast, world);
}

window.RuleLexer = RuleLexer;
window.RuleParser = RuleParser;
window.compileRuleAST = compileRuleAST;
window.toHTMLCompiledRule = toHTMLCompiledRule;
window.isASTTrivialTrue = isASTTrivialTrue;
window.toStringRuleAST = toStringRuleAST;
window.parseRuleString = parseRuleString;

})();
