/**
 * Minimal expression parser for conditional rules. Supports:
 *
 *   LHS = RHS            (equality)
 *   LHS != RHS           (inequality)
 *   LHS = RHS AND LHS2 != RHS2
 *   LHS = RHS OR LHS2 = RHS2
 *
 * Where LHS / RHS can be:
 *   - A source node id (e.g. "b204")
 *   - An EDI seg (e.g. "ISA*06")
 *   - The special "_" for this rule's own source value
 *   - A quoted literal ("ELOGEX" or 'ELOGEX')
 *   - An unquoted token — treated as a reference if it resolves,
 *     otherwise as a literal (so "ELOGEX" without quotes still works)
 *
 * Precedence: AND and OR share the same precedence and associate
 * left-to-right (no parentheses support). Good enough for the real-
 * world DMA conditions we see; can be extended later.
 */

export type Expr =
  | { kind: "compare"; op: "=" | "!="; lhs: Ref; rhs: RefOrLiteral }
  | { kind: "and" | "or"; clauses: Expr[] };

interface Ref {
  kind: "ref";
  /** The raw token value — could be an id, a seg, or "_". */
  name: string;
}

interface Literal {
  kind: "literal";
  value: string;
  /** True when the token was explicitly quoted. */
  explicit: boolean;
}

type RefOrLiteral = Ref | Literal;

type Token =
  | { kind: "ref"; value: string }
  | { kind: "literal"; value: string; explicit: boolean }
  | { kind: "op"; value: "=" | "!=" }
  | { kind: "conj"; value: "AND" | "OR" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < input.length && input[j] !== quote) j++;
      tokens.push({ kind: "literal", value: input.slice(i + 1, j), explicit: true });
      i = j + 1;
      continue;
    }
    if (c === "!" && input[i + 1] === "=") {
      tokens.push({ kind: "op", value: "!=" });
      i += 2;
      continue;
    }
    if (c === "=") {
      tokens.push({ kind: "op", value: "=" });
      i++;
      continue;
    }
    let j = i;
    while (j < input.length && !/[\s!=]/.test(input[j])) j++;
    const word = input.slice(i, j);
    if (/^AND$/i.test(word)) tokens.push({ kind: "conj", value: "AND" });
    else if (/^OR$/i.test(word)) tokens.push({ kind: "conj", value: "OR" });
    else tokens.push({ kind: "ref", value: word });
    i = j;
  }
  return tokens;
}

/** Parse a condition string into an Expr AST. Returns null on syntax
 * error — callers fall back to legacy handling. */
export function parse(input: string): Expr | null {
  const tokens = tokenize(input);
  if (tokens.length === 0) return null;

  const clauses: Expr[] = [];
  const conjs: ("AND" | "OR")[] = [];

  let i = 0;
  while (i < tokens.length) {
    // Each clause is LHS OP RHS — 3 tokens.
    if (i + 2 >= tokens.length) return null;
    const lhs = tokens[i];
    const op = tokens[i + 1];
    const rhs = tokens[i + 2];
    if (lhs.kind !== "ref") return null;
    if (op.kind !== "op") return null;
    if (rhs.kind !== "ref" && rhs.kind !== "literal") return null;
    clauses.push({
      kind: "compare",
      op: op.value,
      lhs: { kind: "ref", name: lhs.value },
      rhs:
        rhs.kind === "literal"
          ? { kind: "literal", value: rhs.value, explicit: rhs.explicit }
          : { kind: "ref", name: rhs.value },
    });
    i += 3;
    if (i >= tokens.length) break;
    if (tokens[i].kind !== "conj") return null;
    conjs.push((tokens[i] as Extract<Token, { kind: "conj" }>).value);
    i++;
  }

  if (clauses.length === 1) return clauses[0];

  // Combine left-to-right, collapsing runs of the same conjunction into
  // a single node with many clauses.
  let result = clauses[0];
  for (let k = 0; k < conjs.length; k++) {
    const conj = conjs[k];
    const next = clauses[k + 1];
    const kind = conj === "AND" ? "and" : "or";
    if (result.kind === kind) {
      result.clauses.push(next);
    } else {
      result = { kind, clauses: [result, next] };
    }
  }
  return result;
}

/** Resolver interface — called by evaluator for each reference. "_"
 * is handled by the caller (see evaluateConditional in apply.ts). */
export type ResolveRef = (name: string) => string | undefined;

export function evaluate(expr: Expr, resolve: ResolveRef): boolean {
  if (expr.kind === "compare") {
    const lhsVal = (resolve(expr.lhs.name) ?? "").trim();
    const rhsVal = (resolveRhs(expr.rhs, resolve) ?? "").trim();
    const equal = lhsVal.toLowerCase() === rhsVal.toLowerCase();
    return expr.op === "=" ? equal : !equal;
  }
  if (expr.kind === "and") return expr.clauses.every((c) => evaluate(c, resolve));
  if (expr.kind === "or") return expr.clauses.some((c) => evaluate(c, resolve));
  return false;
}

function resolveRhs(r: RefOrLiteral, resolve: ResolveRef): string | undefined {
  if (r.kind === "literal") return r.value;
  // Unquoted ref — try resolution first, fall back to the raw token.
  const resolved = resolve(r.name);
  if (resolved !== undefined && resolved !== "") return resolved;
  return r.name;
}
