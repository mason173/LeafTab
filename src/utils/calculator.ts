type Operator = '+' | '-' | '*' | '/' | '%' | '^' | 'u-';
type Token = number | Operator | '(' | ')';

export type CalculatorPreview = {
  expression: string;
  result: number;
  resultText: string;
};

const OP_PRECEDENCE: Record<Operator, number> = {
  'u-': 4,
  '^': 3,
  '*': 2,
  '/': 2,
  '%': 2,
  '+': 1,
  '-': 1,
};

const RIGHT_ASSOCIATIVE = new Set<Operator>(['u-', '^']);
const BINARY_OPERATORS = new Set<Operator>(['+', '-', '*', '/', '%', '^']);

function normalizeExpression(raw: string): string {
  return raw
    .trim()
    .replace(/=/g, '')
    .replace(/[，,]/g, '')
    .replace(/[×xX]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ');
}

function tokenizeExpression(raw: string): Token[] | null {
  const source = normalizeExpression(raw).replace(/\s+/g, '');
  if (!source || source.length > 160) return null;

  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\d|\./.test(ch)) {
      let j = i + 1;
      let dotCount = ch === '.' ? 1 : 0;
      while (j < source.length && /[\d.]/.test(source[j])) {
        if (source[j] === '.') dotCount += 1;
        if (dotCount > 1) return null;
        j += 1;
      }
      const value = Number(source.slice(i, j));
      if (!Number.isFinite(value)) return null;
      tokens.push(value);
      i = j;
      continue;
    }

    if (ch === '(' || ch === ')') {
      tokens.push(ch);
      i += 1;
      continue;
    }

    if (ch === '*' && source[i + 1] === '*') {
      tokens.push('^');
      i += 2;
      continue;
    }

    if (/[+\-*/%^]/.test(ch)) {
      const prev = tokens[tokens.length - 1];
      const unaryPosition = tokens.length === 0 || prev === '(' || (typeof prev === 'string' && prev !== ')');
      if (ch === '+' && unaryPosition) {
        i += 1;
        continue;
      }
      if (ch === '-' && unaryPosition) {
        tokens.push('u-');
        i += 1;
        continue;
      }
      tokens.push(ch as Operator);
      i += 1;
      continue;
    }

    return null;
  }

  return tokens;
}

function toRpn(tokens: Token[]): Token[] | null {
  const output: Token[] = [];
  const operators: Array<Operator | '('> = [];

  for (const token of tokens) {
    if (typeof token === 'number') {
      output.push(token);
      continue;
    }
    if (token === '(') {
      operators.push(token);
      continue;
    }
    if (token === ')') {
      while (operators.length && operators[operators.length - 1] !== '(') {
        output.push(operators.pop() as Operator);
      }
      if (operators.pop() !== '(') return null;
      continue;
    }

    const operator = token as Operator;
    while (operators.length) {
      const top = operators[operators.length - 1];
      if (top === '(') break;
      const topOperator = top as Operator;
      const shouldPop = RIGHT_ASSOCIATIVE.has(operator)
        ? OP_PRECEDENCE[operator] < OP_PRECEDENCE[topOperator]
        : OP_PRECEDENCE[operator] <= OP_PRECEDENCE[topOperator];
      if (!shouldPop) break;
      output.push(operators.pop() as Operator);
    }
    operators.push(operator);
  }

  while (operators.length) {
    const op = operators.pop() as Operator | '(';
    if (op === '(') return null;
    output.push(op);
  }

  return output;
}

function evaluateRpn(tokens: Token[]): number | null {
  const stack: number[] = [];

  for (const token of tokens) {
    if (typeof token === 'number') {
      stack.push(token);
      continue;
    }

    if (token === 'u-') {
      const value = stack.pop();
      if (!Number.isFinite(value)) return null;
      stack.push(-(value as number));
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();
    if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
    let next = 0;
    switch (token) {
      case '+':
        next = (left as number) + (right as number);
        break;
      case '-':
        next = (left as number) - (right as number);
        break;
      case '*':
        next = (left as number) * (right as number);
        break;
      case '/':
        if ((right as number) === 0) return null;
        next = (left as number) / (right as number);
        break;
      case '%':
        if ((right as number) === 0) return null;
        next = (left as number) % (right as number);
        break;
      case '^':
        next = (left as number) ** (right as number);
        break;
      default:
        return null;
    }
    if (!Number.isFinite(next)) return null;
    stack.push(next);
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) return null;
  const rounded = Number(stack[0].toFixed(10));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatResultValue(value: number): string {
  const normalized = Number.isInteger(value) ? value : Number(value.toFixed(10));
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(normalized);
}

export function getCalculatorPreview(rawInput: string): CalculatorPreview | null {
  const expression = normalizeExpression(rawInput);
  if (!expression) return null;

  const tokens = tokenizeExpression(expression);
  if (!tokens || tokens.length === 0) return null;
  const hasBinaryOperator = tokens.some((token) => typeof token === 'string' && BINARY_OPERATORS.has(token as Operator));
  if (!hasBinaryOperator) return null;

  const rpn = toRpn(tokens);
  if (!rpn) return null;

  const result = evaluateRpn(rpn);
  if (result === null) return null;
  if (!Number.isFinite(result)) return null;

  return {
    expression,
    result,
    resultText: formatResultValue(result as number),
  };
}
