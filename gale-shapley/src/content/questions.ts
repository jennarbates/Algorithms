import type { Side } from '../core/types';
import type { Term } from './proofs';

/**
 * The practice questions.
 *
 * The walkthrough shows one run and lets a reader try to break the result. That
 * is enough to follow the process and not enough to survive a problem set, which
 * asks for something else: run it by hand on an instance nobody has animated,
 * find the other arrangement, say precisely what a statement claims, negate it,
 * and find the break in an argument that reaches the right conclusion the wrong
 * way. These are those questions.
 *
 * Two rules hold everything here together.
 *
 * **Nothing that can be computed is written down.** Where a question has an
 * answer the core can work out, the question does not store the answer: it
 * stores the instance and the side, and the component runs the engine. The
 * arrangement questions do not even store which options are correct, because
 * `isStable` decides that, and the sentence naming the two people who would
 * both switch is generated from `blockingPairs`. A preference list can be
 * edited and the questions follow it or the suite fails; they cannot quietly
 * start teaching something false.
 *
 * **Tier 1 speaks the page's own language, tiers 2 and 3 are allowed the
 * textbook's.** Tier 1 is held to the same banned word list as the log and the
 * proof section. The later tiers are formal, because a problem set says "stable
 * matching" and a reader who has only ever met "an arrangement that holds" is
 * stranded at the first line. They earn the words the same way the "Why this
 * works" expanders do: every one of them is introduced with the plain phrase it
 * replaces, in `FORMAL_TERMS`, and `tests/questions.test.ts` fails the build
 * if a term reaches the page without an entry.
 *
 * The three tiers are a ramp, and so is the order inside each one. Tier 1 asks
 * for the run itself. Tier 2 asks what a statement about it means, which is the
 * skill a problem set actually grades. Tier 3 asks the questions a textbook
 * chapter ends on: how many questions the process can possibly ask, what the
 * bound depends on besides the procedure, the proof that the asking side does
 * best, whether misreporting a list pays, and which of the assumptions are
 * load-bearing.
 *
 * Every option carries its own reason, including the wrong ones, and the wrong
 * ones are not filler. Each is an answer somebody actually gives: the run that
 * is offered as "another arrangement" when it is the run already done, the
 * counterexample that stops one matching short, the negation that flipped the
 * relation and left the quantifiers alone.
 */

export type Tier = 1 | 2 | 3 | 4;

/** One option in a written question, with the reason it stands or falls. */
export interface Option {
  readonly t: string;
  /** Absent means false. Which is correct is fixed text here, unlike arrangements. */
  readonly ok?: true;
  readonly why: string;
}

/** One line of an argument, offered with the wrong lines a reader actually writes. */
export interface ProofStep {
  readonly lead: string;
  readonly options: readonly Option[];
}

/** A candidate arrangement. Whether it holds is computed, never stored. */
export interface Candidate {
  /** student id to school id. */
  readonly pairs: Readonly<Record<string, string>>;
  /** What this one is here to test, beyond the pair that breaks it. */
  readonly note: string;
}

interface Common {
  readonly id: string;
  readonly tier: Tier;
  /** The belief the question is aimed at, shown above the prompt. */
  readonly tests: string;
  readonly prompt: string;
  /** Shown in a monospaced block under the prompt, for a statement or an argument. */
  readonly quote?: string;
  /** What the question was really about, shown once it has been answered. */
  readonly close: string;
}

/** Work the run by hand: put every student somewhere, and be right about all of them. */
export interface PairingQuestion extends Common {
  readonly kind: 'pairing';
  readonly instanceId: string;
  readonly side: Side;
  /** One line per student, saying why they land where the engine puts them. */
  readonly rows: Readonly<Record<string, string>>;
}

/** Tick the arrangements that hold. Correctness comes from `isStable`. */
export interface ArrangementsQuestion extends Common {
  readonly kind: 'arrangements';
  readonly instanceId: string;
  readonly candidates: readonly Candidate[];
}

export interface ChoiceQuestion extends Common {
  readonly kind: 'choice';
  readonly options: readonly Option[];
}

export interface MultiQuestion extends Common {
  readonly kind: 'multi';
  readonly options: readonly Option[];
}

export interface ProofQuestion extends Common {
  readonly kind: 'proof';
  readonly steps: readonly ProofStep[];
}

export type Question =
  PairingQuestion | ArrangementsQuestion | ChoiceQuestion | MultiQuestion | ProofQuestion;

/**
 * The textbook words the formal tiers use, each with the plain phrase the rest
 * of the page uses for it. Shown beside the questions, not hidden behind a link,
 * because a reader meeting "stable matching" for the first time needs it in
 * front of them rather than one click away.
 */
export const FORMAL_TERMS: readonly Term[] = [
  { term: 'instance', replaces: 'one complete set of lists to work with' },
  { term: 'matching', replaces: 'an arrangement, who ended up with whom' },
  { term: 'stable', replaces: 'holds, cannot be broken' },
  { term: 'blocking pair', replaces: 'two people who would both rather have each other' },
  { term: 'propose', replaces: 'ask' },
  { term: 'proposer', replaces: 'whoever is doing the asking' },
  { term: 'receiver', replaces: 'whoever is being asked' },
  { term: 'reject', replaces: 'turn away' },
  { term: 'optimal', replaces: 'the best anybody on this side can do here' },
  { term: 'pessimal', replaces: 'the worst anybody on this side can do here' },
  { term: 'algorithm', replaces: 'the process' },
];

/** The statement tier 2 works on, quoted once and referred to throughout. */
export const STATEMENT =
  'In every instance of the Stable Matching Problem, there is a stable matching containing a ' +
  'pair (c, s) such that c is ranked first on the preference list of s and s is ranked first ' +
  'on the preference list of c.';

export const QUESTIONS: readonly Question[] = [
  // ---------------------------------------------------------------------------
  // Tier 1. The run itself, on an instance the walkthrough never animates, in the
  // page's own words.
  // ---------------------------------------------------------------------------

  {
    id: 'run-students',
    tier: 1,
    kind: 'pairing',
    tests: 'working a run by hand',
    instanceId: 'worksheet',
    side: 'students',
    prompt: 'Four students, four seats, and the students are asking. Where does everybody end up?',
    rows: {
      priya:
        'Berkeley is her first choice, and the one person Berkeley likes better never asks it. The first question she asks is the last one she needs.',
      sam: 'MIT is his first choice, and MIT would take him over anybody except Priya, who is not asking MIT.',
      ravi: 'MIT turns him away: it is holding Sam and likes Sam better. UMass Amherst is next on his list and has nobody.',
      maya: 'Berkeley turns her away: she is last on its list and it is holding Priya. NYU is next and has nobody.',
    },
    close:
      'Nobody is displaced in this run. Two people are turned away on the spot, which is a different thing: being turned away costs you a name off your own list, being displaced costs somebody else theirs.',
  },

  {
    id: 'run-schools',
    tier: 1,
    kind: 'pairing',
    tests: 'whether the answer depends on who asks',
    instanceId: 'worksheet',
    side: 'schools',
    prompt:
      'Same four people, same lists, but now the schools are asking. Where does everybody end up?',
    rows: {
      priya:
        'Four schools ask her and she trades up her own list every time: MIT holds her, then NYU takes her, then UMass Amherst, then Berkeley, which is where she wanted to be all along.',
      sam: 'UMass Amherst asks first and holds him, then MIT asks and he lets UMass go. Berkeley asks after that and he turns it down, because MIT is his first choice and he already has it. MIT is where the other run left him too.',
      ravi: 'NYU asks him once Priya is gone. Nobody else asks him at all, so he has no say in it beyond yes.',
      maya: "UMass Amherst asks her last, after Sam and Priya are both out of reach. She is nowhere near the top of anybody's list here.",
    },
    close:
      'Priya and Sam are in the same seats as before. Ravi and Maya have swapped. Who does the asking changes part of the answer and not all of it, and the part it cannot change is the part that was never in dispute.',
  },

  {
    id: 'which-hold',
    tier: 1,
    kind: 'arrangements',
    tests: 'what makes an arrangement hold',
    instanceId: 'worksheet',
    prompt:
      'Here are six ways to seat these four students. Tick every one that cannot be broken by two people who would both rather have each other.',
    candidates: [
      {
        pairs: { priya: 'berkeley', sam: 'mit', ravi: 'umass', maya: 'nyu' },
        note: 'This is the one the students asking produced.',
      },
      {
        pairs: { priya: 'berkeley', sam: 'umass', ravi: 'mit', maya: 'nyu' },
        note: 'Sam and Ravi have swapped seats from the students-asking run, and nobody else has moved.',
      },
      {
        pairs: { priya: 'berkeley', sam: 'mit', ravi: 'nyu', maya: 'umass' },
        note: 'This is the one the schools asking produced, and the answer to "find another one".',
      },
      {
        pairs: { priya: 'mit', sam: 'berkeley', ravi: 'umass', maya: 'nyu' },
        note: 'Two people who were both settled have swapped, which is the usual way to produce something that looks reasonable and is not.',
      },
      {
        pairs: { priya: 'nyu', sam: 'mit', ravi: 'umass', maya: 'berkeley' },
        note: 'Two of the four are at their first choice and nobody is at their last. Comfort is not the test.',
      },
      {
        pairs: { priya: 'umass', sam: 'nyu', ravi: 'berkeley', maya: 'mit' },
        note: 'Everybody moved, and the further an arrangement gets from either run the more ways there are to break it.',
      },
    ],
    close:
      'Two of the six hold, and they are exactly the two the process produced from the two directions. That is not a coincidence here, and it is not a rule either: an instance can have arrangements that hold which neither direction ever reaches.',
  },

  {
    id: 'who-is-fixed',
    tier: 1,
    kind: 'choice',
    tests: 'what being in the same seat twice means',
    prompt:
      'Priya ends at Berkeley and Sam at MIT whichever side does the asking. What does that tell you about them?',
    options: [
      {
        t: 'They are in the same seats in every arrangement that holds here, not only in those two runs.',
        ok: true,
        why: 'The two runs are the best and the worst any arrangement can do for a given side, so they bracket the rest. Anybody sitting in the same seat at both ends of that range has nowhere else to be.',
      },
      {
        t: 'They were lucky with the order the questions happened to be asked in.',
        why: 'The order changes nothing. Ask the questions in any order at all, with the same side asking, and the ending is the same. That is a property of the process, not of this instance.',
      },
      {
        t: 'Berkeley and MIT are the two strongest schools, so they settle first.',
        why: 'There is no ranking of schools here beyond the lists on the page, and nothing settles first. Everything stays provisional until the whole thing stops.',
      },
      {
        t: 'This instance has exactly one arrangement that holds.',
        why: 'It has two, and the second run found the other one. They differ on Ravi and Maya, which is precisely why Priya and Sam standing still is worth noticing.',
      },
    ],
    close:
      'The two runs are the far ends of what is possible. Whoever does not move between them cannot move at all, and whoever does is exactly who the choice of side is deciding for.',
  },

  {
    id: 'another-one',
    tier: 1,
    kind: 'choice',
    tests: 'whether the second answer is a second answer',
    prompt:
      'A worksheet answer runs the process with the students asking, and then answers "find another arrangement that holds" with "have the students be the ones who ask". What is wrong with it?',
    options: [
      {
        t: 'Nothing, as long as it also writes out what the arrangement is.',
        why: 'Writing it out is what exposes the problem: the seats would be the same four seats as the answer above it. The method is sound, and here it was applied to the run it came from.',
      },
      {
        t: 'Flipping which side asks never produces a different arrangement.',
        why: 'It usually does. On this instance the two runs differ on Ravi and Maya. One of the sets of lists on this page does give the same answer either way, and it does that because there is only one arrangement to be found.',
      },
      {
        t: 'That is the run it has already done. It hands back the arrangement it started from.',
        ok: true,
        why: 'Flipping the side is the right instinct and it was pointed at the wrong starting point. From a students-asking run, the second arrangement comes from the schools asking.',
      },
      {
        t: 'A second arrangement has to be found by hand, because the process only ever produces one.',
        why: 'The process produces one per direction, so two candidates come for free, and on this instance those two are the only two there are. On an instance with more, the rest do have to be found by hand.',
      },
    ],
    close:
      'Both runs are worth doing and worth labelling as you go. The commonest way to answer "find another one" wrongly is to hand back the one already on the page.',
  },

  {
    id: 'order-free',
    tier: 1,
    kind: 'choice',
    tests: 'whether the route changes the ending',
    prompt:
      'Two people work the same instance with the same side asking, and pick a different person to ask next at every stage. What happens?',
    options: [
      {
        t: 'They get different endings, which is why a worksheet has to fix an order.',
        why: 'A worksheet fixes an order so that two people can compare their working line by line, not because the ending depends on it.',
      },
      {
        t: 'They get the same ending only if nobody is displaced on the way.',
        why: 'Displacements are where two routes differ most, and the endings still agree. In the schools-asking run here Priya holds four different schools before she settles, letting three of them go, and where she ends does not depend on which school asked her first.',
      },
      {
        t: 'They get the same ending only when exactly one arrangement holds.',
        why: 'The ending is fixed per direction even when several arrangements hold. This instance has two, and the students asking always produce the same one of them.',
      },
      {
        t: 'They get the same ending. Which question comes next changes the story and not the result.',
        ok: true,
        why: 'Whoever is asking ends up with the best seat available to them in any arrangement that holds, and that is a fact about the lists rather than about the route. There is nothing to break a tie over, so there is nothing for two people to disagree about.',
      },
    ],
    close:
      'The route is not part of the answer. That is worth knowing before a problem set, because the working shown in a solution will rarely be the working you did.',
  },

  // ---------------------------------------------------------------------------
  // Tier 2. The statement from K&T chapter 1, exercise 1, and the exact reading
  // of it. This is where the textbook words appear, and FORMAL_TERMS is what
  // buys them.
  // ---------------------------------------------------------------------------

  {
    id: 'what-is-an-instance',
    tier: 2,
    kind: 'choice',
    tests: 'what the statement is quantifying over',
    quote: STATEMENT,
    prompt: 'Before anything else: what is an instance of the Stable Matching Problem?',
    options: [
      {
        t: 'A set of stable matchings, together with which side proposes and which side accepts.',
        why: 'Those are outputs and a choice about how to run the algorithm. An instance is fixed before any of that: the same instance can be run in either direction, which is exactly what the first tier was doing.',
      },
      {
        t: 'One complete set of inputs: the colleges, the students, and a strict ranking of the whole other side for each of them.',
        ok: true,
        why: 'It is the question, written out in full. Nothing about how it will be solved is part of it, and nothing about the answer is either.',
      },
      {
        t: 'The algorithm, applied to a particular set of preference lists.',
        why: 'An instance exists whether or not anybody runs anything on it. The algorithm is one way of answering the question; the instance is the question.',
      },
      {
        t: 'A single matching of colleges to students.',
        why: 'One matching is a candidate answer to an instance. An instance of size n has n! of them, and the statement is about which of those are stable.',
      },
    ],
    close:
      'A claim that starts "in every instance" is quantifying over inputs, so pinning down what an input is settles what is being claimed before any of the logic starts. The other word to carry across from tier 1: a matching is stable when it has no blocking pair, which is two people who would both rather have each other under its textbook name.',
  },

  {
    id: 'formalise',
    tier: 2,
    kind: 'choice',
    tests: 'turning English into quantifiers',
    quote: STATEMENT,
    prompt:
      'Let I be an instance and M a stable matching. Which formula says this? Read first(c, s) as "c is ranked first on the list of s".',
    options: [
      {
        t: '∀I  ∃M  ∀(c, s) ∈ M :  first(c, s) ∧ first(s, c)',
        why: 'This asks every pair in M to be a mutual first choice, which is the claim that everybody gets their first choice. The English says "containing a pair", and a matching that contains one may contain nothing else of the kind.',
      },
      {
        t: '∀I  ∃M  ∃(c, s) ∈ M :  first(c, s) ∧ first(s, c)',
        ok: true,
        why: 'Three English phrases, three quantifiers, in the order they are written: "in every instance" is ∀I, "there is a stable matching" is ∃M, and "containing a pair" is ∃(c, s).',
      },
      {
        t: '∀I  ∀M  ∃(c, s) ∈ M :  first(c, s) ∧ first(s, c)',
        why: 'This asks every stable matching to contain such a pair. The English says "there is a stable matching", which is ∃M. The gap between these two is exactly what the flawed answer two questions along falls into.',
      },
      {
        t: '∃I  ∃M  ∀(c, s) ∈ M :  first(c, s) ∧ first(s, c)',
        why: 'This says some instance has such a matching, which is much weaker and easy to satisfy: any instance where two people are each other’s first choice will do. "In every instance" is ∀I, and it is the first thing in the sentence.',
      },
    ],
    close:
      'Underline the English phrases that act as quantifiers and the formula writes itself, in the order they appear. Every dispute about a statement like this one is a dispute about those three phrases.',
  },

  {
    id: 'negate-formally',
    tier: 2,
    kind: 'multi',
    tests: 'negating a statement with three quantifiers',
    quote: 'The statement is  ∀I  ∃M  ∃(c, s) ∈ M :  φ,  where φ is  first(c, s) ∧ first(s, c).',
    prompt: 'Tick every correct negation. There is more than one.',
    options: [
      {
        t: '∃I  ∀M  ¬(∃(c, s) ∈ M :  φ)',
        ok: true,
        why: 'The negation one line before it is finished: the outer two quantifiers have turned over and the ¬ is still sitting where the last ∃ used to be. Correct as it stands, and one push away from the row below.',
      },
      {
        t: '∀I  ∃M  ∀(c, s) ∈ M :  ¬φ',
        why: 'Only the inside was negated. This says every instance has a stable matching in which no pair is a mutual first choice, which can be true at the same time as the original, so it cannot be its negation.',
      },
      {
        t: '∃I  ∀M  ∀(c, s) ∈ M :  ¬φ',
        ok: true,
        why: 'The finished form, and the one to aim for: some instance, every stable matching of it, every pair in that matching. Pushing the ¬ through the last ∃ in the row above turns it into this.',
      },
      {
        t: '∃I  ∃M  ∀(c, s) ∈ M :  ¬φ',
        why: 'The ∃M should have become ∀M. As written this only produces one bad matching, and the original claim asks for one good one, so both can hold together.',
      },
      {
        t: '∃I  ∀M  ∃(c, s) ∈ M :  ¬φ',
        why: 'The innermost quantifier was left as ∃. This says every stable matching has some pair that is not a mutual first choice, which nearly every matching satisfies, including ones that also contain a mutual first pair.',
      },
      {
        t: '∀I  ∀M  ∀(c, s) ∈ M :  ¬φ',
        why: 'Too strong by a long way: it claims no instance anywhere has such a pair, and plenty do. Negating "for every instance" gives "for some instance", never "for no instance".',
      },
    ],
    close:
      'Negation walks left to right: every quantifier turns into the other kind, nothing moves, and what is left at the end is a ¬ that can be pushed in or left standing. Two of these are the same statement at two points in that walk.',
  },

  {
    id: 'negate-in-english',
    tier: 2,
    kind: 'choice',
    tests: 'the same negation, in words',
    quote: STATEMENT,
    prompt: 'Which sentence is the negation of the statement above?',
    options: [
      {
        t: 'In every instance, there is no stable matching containing such a pair.',
        why: '"In every instance" survived unnegated. This says the statement fails everywhere, and the negation only needs it to fail once.',
      },
      {
        t: 'In every instance, there is a stable matching containing no pair (c, s) with c first on the list of s and s first on the list of c.',
        why: 'Only the innermost part was negated and ∀I ∃M was left standing. This and the original can both be true of the same instance, which is the sign that one is not the negation of the other.',
      },
      {
        t: 'There is an instance in which every stable matching contains no pair (c, s) with c first on the list of s and s first on the list of c.',
        ok: true,
        why: '"In every instance" became "there is an instance", "there is a stable matching" became "every stable matching", and the relation at the end went negative. Three phrases, three changes.',
      },
      {
        t: 'There is an instance with a stable matching containing no pair (c, s) with c first on the list of s and s first on the list of c.',
        why: '"Some stable matching lacks one" where the negation needs "every stable matching lacks one". This is the flawed answer in the next question, written out in English.',
      },
    ],
    close:
      'The English phrases carrying the quantifiers are "in every instance", "there is a stable matching" and "containing a pair". Negating the sentence means turning over each of the three, and nothing else in it moves.',
  },

  {
    id: 'flawed-counterexample',
    tier: 2,
    kind: 'choice',
    tests: 'how much a counterexample has to rule out',
    quote:
      '"The statement is false. Consider the instance\n' +
      '    c1 : s1 > s2        s1 : c2 > c1\n' +
      '    c2 : s2 > s1        s2 : c1 > c2\n' +
      'In the stable matching M = {(c1, s1), (c2, s2)}, neither student has their\n' +
      'first choice, so M does not include a pair (c, s) where c is ranked first\n' +
      'on the list of s and s is ranked first on the list of c."',
    prompt:
      'The instance here is a good one and the conclusion drawn from it is right. What has the argument not shown?',
    options: [
      {
        t: 'It checked one stable matching. The statement says some stable matching contains such a pair, so refuting it means ruling out every stable matching of the instance, and this one has two.',
        ok: true,
        why: 'This is the ∃M that became ∀M under negation, and it is the whole of the work. The other stable matching here is {(c1, s2), (c2, s1)}, in which both students do get their first choice, and it has no mutual first pair either. Saying so finishes the proof.',
      },
      {
        t: 'Its reasoning about M is wrong, because M is not stable.',
        why: 'M is stable. c1 has s1 and c2 has s2, which are their first choices, so neither college would move anywhere, and it takes two. Calling a stable matching unstable is the other way to lose this question.',
      },
      {
        t: 'Whether the students have their first choice is beside the point, because the claim is about the colleges.',
        why: 'The claim is about a pair that is first on both lists, so it is about both sides at once. Noticing that no student is matched to their own top college does settle it for this M, since a pair needs first(c, s) as well.',
      },
      {
        t: 'Nothing. It exhibits an instance and a matching with no such pair, which is what the negation asks for.',
        why: 'The negation asks for an instance in which every stable matching lacks such a pair. One matching is an example, and an example is not the universal claim the negation makes about that instance.',
      },
    ],
    close:
      'This instance is on the page as "Two who want what wants somebody else". Nobody in it is first on the list of anybody who is first on theirs, which is why both of its arrangements lack the pair. The argument had the right instance and stopped one matching short of showing it.',
  },

  {
    id: 'disprove',
    tier: 2,
    kind: 'proof',
    tests: 'building the disproof that the flawed answer nearly had',
    quote: STATEMENT,
    prompt: 'Build the proof that the statement is false.',
    steps: [
      {
        lead: 'What has to be produced',
        options: [
          {
            t: 'An instance in which every stable matching lacks a pair that is first on both lists.',
            ok: true,
            why: 'This is the negation, read off the formula: ∃I, then ∀M. The instance is the easy half and the ∀M is the half that gets skipped.',
          },
          {
            t: 'An instance with a stable matching that lacks such a pair.',
            why: 'That is one example, and the negation makes a universal claim about the instance: every stable matching of it, not some.',
          },
          {
            t: 'A proof that no instance has a stable matching containing such a pair.',
            why: 'Far stronger than the negation, and false. Any instance where two people are each other’s first choice has one. Negating "for every instance" gives "for some instance".',
          },
        ],
      },
      {
        lead: 'The instance',
        options: [
          {
            t: 'Two colleges and two students who agree on everything: c1 : s1 > s2, c2 : s1 > s2, s1 : c1 > c2, s2 : c1 > c2.',
            why: 'Here c1 and s1 are each other’s first choice, so the matching pairing them is stable and contains exactly the pair the statement asks for. This instance confirms the statement instead of breaking it.',
          },
          {
            t: 'One college and one student.',
            why: 'With one of each there is a single matching, and that pair is first on both lists by default. The smallest instance that can fail is two and two.',
          },
          {
            t: 'Two colleges and two students, with c1 : s1 > s2, c2 : s2 > s1, s1 : c2 > c1, s2 : c1 > c2.',
            ok: true,
            why: 'Arranged in a cycle: c1 wants s1, s1 wants c2, c2 wants s2, and s2 wants c1. Each college has a top student whose own top choice is the other college, so no pair anywhere is first on both lists. That is stronger than the proof strictly needs, and it is what makes the last step one sentence.',
          },
        ],
      },
      {
        lead: 'What to check',
        options: [
          {
            t: 'Every stable matching of the instance. There are two: {(c1, s1), (c2, s2)} and {(c1, s2), (c2, s1)}.',
            ok: true,
            why: 'With two and two there are only two matchings at all, and both turn out to be stable, so the whole check is two lines. Saying that both are stable is part of the proof rather than an aside.',
          },
          {
            t: 'The matching the propose and reject algorithm returns, which is stable by the theorem.',
            why: 'It returns one stable matching per direction. Two runs is two matchings, and there is no general reason those are all of them. Here they happen to be, and that is something to state, not to assume.',
          },
          {
            t: 'Every matching, stable or not.',
            why: 'More work than the claim needs. The statement only ever talks about stable matchings, so the unstable ones are outside it.',
          },
        ],
      },
      {
        lead: 'The check',
        options: [
          {
            t: 'Neither gives a student their first choice, so neither can contain such a pair.',
            why: 'True of the first matching and false of the second, where both students do get their first choice. The second is still fine, for the other reason: neither student is first on the list of the college they got.',
          },
          {
            t: 'Neither contains a mutual first choice, because no pair in this instance is first on both lists at all: c1 tops the list of s2 while c1 wants s1, and c2 tops the list of s1 while c2 wants s2.',
            ok: true,
            why: 'One sentence covers both matchings, because it is a fact about the instance rather than about either of them. Any matching of this instance lacks the pair, stable or not.',
          },
          {
            t: 'The first contains no such pair, and the second is not stable.',
            why: 'The second is stable. Both students have their first choice in it, so neither would move, and it takes two.',
          },
        ],
      },
      {
        lead: 'The conclusion',
        options: [
          {
            t: 'So this instance has no stable matching containing a pair first on both lists. That is the negation, so the statement is false.',
            ok: true,
            why: 'One instance, a universal claim about it, and the negation is met. Nothing larger was claimed and nothing larger was needed.',
          },
          {
            t: 'So no instance has a stable matching containing such a pair, and the statement is false.',
            why: 'The first half overshoots into a claim about every instance, which is false and was never shown. One instance is all the negation asks for.',
          },
          {
            t: 'So the propose and reject algorithm does not always find such a pair, and the statement is false.',
            why: 'The statement was never about what the algorithm finds. It says some stable matching contains such a pair, however anybody arrives at it.',
          },
        ],
      },
    ],
    close:
      'A disproof of "for every instance" is one instance plus a universal claim about it. Finding the instance is the half people do; ruling out every stable matching of it is the half that makes it a proof.',
  },

  // ---------------------------------------------------------------------------
  // Tier 3. Where a textbook chapter ends: the running time and what it rests
  // on, the proof that the asking side does best, whether lying pays, and which
  // of the assumptions are load-bearing.
  // ---------------------------------------------------------------------------

  {
    id: 'how-many-asks',
    tier: 3,
    kind: 'choice',
    tests: 'the counting argument behind the running time',
    prompt: 'With n on each side, at most how many questions can the process ask before it stops?',
    options: [
      {
        t: 'n, because everybody asks once.',
        why: 'Anybody let go asks again. In the schools-asking run on the four-by-four instance, UMass Amherst asks three times on its own.',
      },
      {
        t: 'n², because each proposer walks down a list of n names and never asks the same name twice.',
        ok: true,
        why: 'Each ask uses up one name from one list, and a used name is never put back. With n lists of n names there are n² names in total, so there are at most n² asks, and that bound is fixed before the run starts.',
      },
      {
        t: 'n!, since that is how many matchings there are.',
        why: 'The process never enumerates matchings, it walks down lists. How many candidate answers exist has nothing to do with how much work is done.',
      },
      {
        t: '2ⁿ in the worst case, because one person being let go can set off a chain.',
        why: 'A chain of displacements is long, not exponential: the cascade preset moves seven people from one question. Every displacement still spends a name off a list, so the same n² ceiling holds.',
      },
    ],
    close:
      'This is the running-time argument in one line, and it is a counting argument rather than a reading of the code: no name is ever returned to a list, so n lists of n names cap the whole run. The exact maximum is a little under the bound, n squared minus n plus 1, and the saving belongs to a receiver rather than to a proposer: every receiver is asked at least once, and the last one to be asked at all is asked exactly once rather than up to n times. Nothing downstream cares about the difference, which is rather the point of a bound.',
  },

  {
    id: 'the-constant-work',
    tier: 3,
    kind: 'choice',
    tests: 'what an O(n²) bound rests on besides the procedure',
    prompt:
      'Every ask ends with a receiver comparing two names on its own list. Written the obvious way, with a scan of the list to find each name, the whole run costs O(n³). What brings it down to O(n²)?',
    options: [
      {
        t: 'Sorting each preference list once at the start.',
        why: 'The lists arrive in order: being in order is what makes them preference lists. Sorting changes nothing, because the cost is in answering "where does this name sit", not in the order of the names.',
      },
      {
        t: 'Keeping the proposers who are free in a queue rather than a list.',
        why: 'Worth doing, and not this. Choosing who asks next is already constant time from a stack or a queue. The cubic term comes from the comparison inside the ask.',
      },
      {
        t: 'For each receiver, an array giving the position of every proposer on its list, built once before the run.',
        ok: true,
        why: 'Building all n of those arrays costs O(n²), which is already the budget, and every comparison afterwards is two array reads rather than a scan. "Do I prefer this one to the one I am holding" becomes a comparison of two numbers.',
      },
      {
        t: 'Nothing does. Comparing two names on a list of length n is inherently O(n).',
        why: 'It is O(n) only if the answer has to be searched for. The ranking is fixed for the whole run, so it can be inverted once and looked up forever after.',
      },
    ],
    close:
      'The procedure and its running time are two separate claims, and the second one is as much about how the input is stored as about what the code does. This is the usual shape of an O(n²) bound: a count of the operations, plus a data structure that makes each one constant.',
  },

  {
    id: 'proposer-optimal',
    tier: 3,
    kind: 'proof',
    tests: 'the proof that the asking side does best',
    quote:
      'Call a receiver r a valid partner of proposer p if some stable matching pairs them.\n' +
      'Claim: no proposer is ever rejected by a valid partner.',
    prompt: 'Build the proof.',
    steps: [
      {
        lead: 'The setup',
        options: [
          {
            t: 'Suppose not, and consider the first moment in the whole run at which some proposer p is rejected by a valid partner r.',
            ok: true,
            why: 'Everything rests on "first". It is what lets the next step say that nobody has yet been rejected by a valid partner, which is the only fact the argument has to work with.',
          },
          {
            t: 'Suppose not, and consider any moment at which some proposer p is rejected by a valid partner r.',
            why: 'Without "first" the next step has nothing: other rejections by valid partners may already have happened, and the argument needs to rule exactly those out.',
          },
          {
            t: 'Suppose not, and consider the last moment at which some proposer p is rejected by a valid partner r.',
            why: 'The last one is no easier to reason about than an arbitrary one. The leverage is in there being no earlier violation, not in there being no later one.',
          },
        ],
      },
      {
        lead: 'What the rejection gives you',
        options: [
          {
            t: 'r rejected p because p had already been rejected by everybody above r on p′s list.',
            why: 'That is why p was asking r at all, and it is not what the rejection tells you. What the rejection tells you is about r, not about p.',
          },
          {
            t: 'r rejected p in favour of some p′ that r prefers, and let M be a stable matching pairing p with r.',
            ok: true,
            why: 'A rejection only ever happens because the receiver holds somebody it likes better, and the definition of valid partner hands over the matching M. Both objects are now on the table.',
          },
          {
            t: 'r rejected p because r is p′s last choice.',
            why: 'Nothing in the process consults how the proposer ranks the receiver at the moment of a rejection. The receiver decides on its own list alone.',
          },
        ],
      },
      {
        lead: 'What p′ prefers',
        options: [
          {
            t: 'p′ prefers r to their own partner in M, because p′ has not yet been rejected by any valid partner, so every receiver p′ passed over on the way to r was not a valid partner for p′.',
            ok: true,
            why: 'This is where "first" is spent. p′ is at r, so everything above r on their list has already rejected them, and none of those can have been a valid partner, because this is the first time in the whole run that a valid partner rejects anybody. So every valid partner of p′ is r or below it, and their partner in M is one of those.',
          },
          {
            t: 'p′ prefers r to their own partner in M, because r is holding p′ and the process only ever improves a proposer′s position.',
            why: 'The process improves the receiver′s position over time, never the proposer′s: a proposer moves down their own list and never back up. This has the direction of the argument backwards.',
          },
          {
            t: 'p′ prefers r to their own partner in M, because M is stable and stable matchings give everybody their first choice.',
            why: 'Stable matchings do not give everybody their first choice. On the very first instance on this page, nobody gets everything they want and the arrangement still holds.',
          },
        ],
      },
      {
        lead: 'The contradiction',
        options: [
          {
            t: 'Then p and r are a blocking pair in M, since p was rejected by r.',
            why: 'p and r are matched to each other in M, and a pair that is already together cannot block. The blocking pair is the other one.',
          },
          {
            t: 'Then M pairs p′ with r, which contradicts M pairing p with r.',
            why: 'M pairs p′ with whoever it pairs them with; nothing said it pairs p′ with r. The contradiction is about stability, not about M contradicting itself.',
          },
          {
            t: 'Then p′ and r are a blocking pair in M: r prefers p′ to p, who is r′s partner in M, and p′ prefers r to their own partner in M. So M is not stable.',
            ok: true,
            why: 'Both halves of a blocking pair, each established by one of the two previous steps. M was chosen to be stable, so the assumption that started the proof is what has to go.',
          },
        ],
      },
      {
        lead: 'What follows',
        options: [
          {
            t: 'No proposer is ever rejected by a valid partner, so every proposer ends with the best valid partner they have, and the outcome does not depend on the order the asks happened in.',
            ok: true,
            why: 'A proposer walks down their list and stops at the first receiver that keeps them. If no valid partner ever rejects them, the one they stop at is the best valid partner on the list, whatever route the run took to get there.',
          },
          {
            t: 'Every proposer ends with their first choice.',
            why: 'Only if their first choice is a valid partner. The claim is that nobody does better than this run in any stable matching, not that everybody gets what they wanted.',
          },
          {
            t: 'Every proposer does at least as well as every receiver.',
            why: 'The two sides are not on a common scale, so there is nothing to compare. The statement is that each proposer does as well as that proposer can do in any stable matching.',
          },
        ],
      },
    ],
    close:
      'The receiving side gets the mirror image, and the proof is the same one read backwards: every receiver ends with the worst valid partner it has. The two halves have names, proposer-optimal and receiver-pessimal, and they are one theorem rather than two. That is the asymmetry the first tier was looking at, stated as a fact about every instance instead of as two runs that came out differently.',
  },

  {
    id: 'the-whole-set',
    tier: 3,
    kind: 'multi',
    tests: 'what holds of every instance rather than of this one',
    prompt:
      'Tick every statement that is true of every instance, not only of the ones on this page.',
    options: [
      {
        t: 'The run in which the students propose gives every student their best valid partner and every school its worst.',
        ok: true,
        why: 'The first half is the theorem the previous question proves, and the second half is its mirror: best for every student is worst for every school, at the same time. On the four-by-four instance the students-asking run leaves NYU with Maya and UMass Amherst with Ravi, and the other arrangement gives each of them the one it preferred.',
      },
      {
        t: 'An instance with n on each side has at most n stable matchings.',
        why: 'The number can be exponential in n. Instances are known with roughly 2^(n/2) of them, which is why "find another one" is a different problem from "find one".',
      },
      {
        t: 'A pair who are first on each other′s lists appears in every stable matching.',
        ok: true,
        why: 'Any matching that separates them is blocked by them: each would rather have the other than anybody, so both would switch. This is the converse of the tier 2 counterexample, which worked precisely because no such pair existed there.',
      },
      {
        t: 'Every stable matching is the output of the algorithm under some order of asks.',
        why: 'The order of asks changes nothing, so one side proposing produces exactly one matching and the two directions produce at most two. The cascade instance on this page has four stable matchings, and two of them are reachable by neither run.',
      },
      {
        t: 'If an instance has exactly one stable matching, the two directions agree.',
        ok: true,
        why: 'Both runs return stable matchings, and there is only one to return. One of the presets on this page is built around exactly this, so that the asymmetry does not get mistaken for a law.',
      },
      {
        t: 'Swapping which side proposes always changes at least one pair.',
        why: 'Only when more than one stable matching exists. When there is exactly one, the two runs return the same matching, and even when there are several, the people matched the same way in both extremes are matched that way in all of them.',
      },
    ],
    close:
      'The two runs are the top and the bottom of the whole set of stable matchings, not two samples from it. Everything in between is invisible to the algorithm, and the questions a problem set asks are usually about that in-between.',
  },

  {
    id: 'does-lying-pay',
    tier: 3,
    kind: 'choice',
    tests: 'whether a true list is the best list to submit',
    prompt:
      'The students are the ones proposing. Can a student end up somewhere they prefer by submitting a list that is not their true ranking?',
    options: [
      {
        t: 'Yes, by moving a school they are likely to get to the top of the list.',
        why: 'Where a school sits on your own list only decides when you ask it. You are held or rejected on the school′s ranking, never on how eager you looked, so promoting a school makes you ask it earlier and be rejected earlier.',
      },
      {
        t: 'No, and the same holds for the schools.',
        why: 'The schools are on the receiving side, and they can gain. A school that truncates its list, refusing anybody below a cut, can end with a student it prefers. Real matching markets worry about the receiving side for exactly this reason.',
      },
      {
        t: 'No. Submitting the true list is a dominant strategy for whoever proposes, whatever everybody else submits.',
        ok: true,
        why: 'A theorem in its own right, due to Dubins and Freedman and independently to Roth, and it needs more than the previous question: a misreported list is stable for the profile that was reported rather than for the true one, so the step from there to the true valid partners has to be argued and not quoted. What it buys is dominance, which holds whatever anybody else submits.',
      },
      {
        t: 'Yes, but only for a student who knows what everybody else submitted.',
        why: 'Knowing the other lists buys a proposer nothing here. The guarantee is not an equilibrium that depends on what others do, it is that no report beats the true one against any fixed behaviour of everybody else.',
      },
    ],
    close:
      'Truth-telling is dominant for whoever asks and not for whoever is asked, and no stable mechanism makes it dominant for both sides at once. That is a theorem, not a gap in this particular algorithm.',
  },

  {
    id: 'what-the-assumptions-buy',
    tier: 3,
    kind: 'choice',
    tests: 'which assumptions are load-bearing',
    prompt:
      'Every list on this page is strict and ranks the whole other side. Allow a list to leave people off. What actually breaks?',
    options: [
      {
        t: 'It finishes stops being true.',
        why: 'It still finishes, and for the same reason: every ask spends a name off a list, and the lists are now shorter rather than longer.',
      },
      {
        t: 'Nobody is left out stops being true, and stability has to be restated so that ending with nobody beats being matched to somebody you left off.',
        ok: true,
        why: 'The counting argument that nobody runs out of list assumed a list with every name on it. Once lists are short, people can end unmatched, and a pair only blocks if each prefers the other to what they have, where "nobody" is now a possible thing to have.',
      },
      {
        t: 'It holds stops being true.',
        why: 'The result is still stable under the restated definition. What changes is that some people end with nobody, not that two of them would both rather switch.',
      },
      {
        t: 'The answer starts to depend on the order of the asks.',
        why: 'It does not. The proposing side still ends with its best valid partner, and which people end up unmatched is the same in every stable matching, which is a theorem in its own right.',
      },
    ],
    close:
      'Ties are the harder relaxation, and the next tier takes them seriously: one notion of a blocking pair splits into two, and only one of the two can always be avoided. The kind that can always be avoided is the one that then becomes hard to optimise: with ties and incomplete lists together, matchings with no strongly blocking pair can differ in size, and finding a largest one is NP-hard. Strictness is not a convenience, it is what makes the single clean answer exist.',
  },

  // ---------------------------------------------------------------------------
  // Tier 4. The chapter's own exercises. Everything up to here has been about one
  // problem with one set of assumptions; these are the questions that ask what the
  // assumptions were doing, and they are where the algorithm turns out to be more
  // robust than the problem statement suggests.
  // ---------------------------------------------------------------------------

  {
    id: 'measure-of-progress',
    tier: 4,
    kind: 'choice',
    tests: 'choosing the quantity that bounds a loop',
    prompt:
      'The proof that the process stops needs a quantity that strictly increases at every step and cannot pass a ceiling. Which of these is one?',
    options: [
      {
        t: 'The number of people who are currently free.',
        why: 'It can stay where it is from one step to the next: a displacement frees the person let go and settles the person asking, leaving the count exactly where it was, and a turn-away changes nothing at all. A quantity that is allowed to stand still bounds nothing. It never rises either, which is worth noticing and does not rescue it.',
      },
      {
        t: 'The number of pairs currently held.',
        why: 'A displacement swaps one held pair for another and leaves it exactly where it was, and so does a turn-away. Two of the three things that can happen do not move it.',
      },
      {
        t: 'The number of pairs (asker, asked) such that the asker has already asked that person.',
        ok: true,
        why: 'Every step adds exactly one, because nobody asks the same person twice, and it can never exceed n². So there are at most n² steps. That is the entire proof, and it is a counting argument rather than anything about what the steps do.',
      },
      {
        t: 'How far down their own list each asker has reached.',
        why: 'This is n numbers rather than one, and it is the right idea half-finished: add them up and you have exactly the quantity in the option above, since how far the askers have collectively reached is how many questions have been asked. Left as a list of n numbers it bounds nothing, because no single one of them has to move at any given step.',
      },
    ],
    close:
      'Finding a measure of progress is the standard way to bound a loop, and all the art is in the choice. Two of the quantities here are allowed to stand still, which disqualifies them, and one is the right idea left as n separate numbers instead of added into one.',
  },

  {
    id: 'nobody-left-out',
    tier: 4,
    kind: 'proof',
    tests: 'the claim that is easiest to assume',
    quote:
      'Claim: when the process stops, every person on both sides is matched.\n' +
      'The lists are strict and complete, and the sides are the same size.',
    prompt: 'Build the proof.',
    steps: [
      {
        lead: 'What is being claimed',
        options: [
          {
            t: 'That the process stops.',
            why: 'A separate theorem with a separate proof, and this one needs it: stopping and stopping in a good state are different claims, and a process could perfectly well stop with somebody left over.',
          },
          {
            t: 'That every asker ends matched, so the result is a perfect matching.',
            ok: true,
            why: 'The whole claim, and what makes it worth proving is that the loop exits when no asker is free, which does not by itself say that nobody ran out of list.',
          },
          {
            t: 'That every asker ends with the best person who did not turn them away.',
            why: 'They end with the last person they asked, which is the worst of those who did not turn them away. True or false, it is not what perfect means.',
          },
        ],
      },
      {
        lead: 'The step to prove first',
        options: [
          {
            t: 'If an asker is free at some point, there is somebody they have not yet asked.',
            ok: true,
            why: 'This is the load-bearing step. With it, the loop can only exit for the right reason, since the exit condition is that no free asker has anybody left to ask.',
          },
          {
            t: 'If an asker is free at some point, somebody has turned them away.',
            why: 'True once they have asked anybody at all, and no use here. What is needed is that they still have somebody left, not that somebody has already refused.',
          },
          {
            t: 'Anybody who has been asked is holding somebody from then on.',
            why: 'True, and it is the ingredient rather than the step: it gets used inside the proof of the step above. On its own it says nothing about the askers.',
          },
        ],
      },
      {
        lead: 'The argument for it',
        options: [
          {
            t: 'Suppose an asker is free and has asked everybody. Then every person on the other side has been asked, so every one of them is holding somebody, so n askers are held. This one is not, and there are only n.',
            ok: true,
            why: 'Counting, and nothing else. The held pairs form a matching, so n people held means n distinct askers held, which uses up everybody and leaves no room for the free one.',
          },
          {
            t: 'Suppose an asker is free and has asked everybody. Then everybody turned them away, so they are last on every list, which cannot happen to more than one person.',
            why: 'Being turned away puts you below whoever was being held at that moment, not last. And being last on every list is perfectly possible for one person anyway.',
          },
          {
            t: 'Suppose an asker is free and has asked everybody. Then n² questions have been asked and the process has to stop.',
            why: 'That is the other theorem arriving early. Running out of steps says the process ends; it says nothing about who is matched when it does.',
          },
        ],
      },
      {
        lead: 'Finishing',
        options: [
          {
            t: 'So every asker is matched, and by symmetry so is everybody on the other side.',
            why: 'Symmetry is not available here: the two sides do not play the same role, and the whole page is about how differently they come out. What settles the other side is counting, since the held pairs are a matching between equal-sized sides.',
          },
          {
            t: 'So the loop can only exit with no free asker, and the held pairs are then a matching covering everybody.',
            ok: true,
            why: 'The exit condition is that no free asker has anybody left to ask. The step just proved says a free asker always does have somebody left, so the loop can only exit with nobody free.',
          },
          {
            t: 'So there are at most n² steps and the result covers everybody.',
            why: 'The step count is true and is not what was just shown. Two theorems that get run together is exactly the mistake this question exists for.',
          },
        ],
      },
    ],
    close:
      'It finishes and nobody is left out are two theorems, not one, and the second is the one people assume. What carries it is a counting argument in the middle: everybody asked is holding somebody, and there are only so many people to hold.',
  },

  {
    id: 'good-and-bad',
    tier: 4,
    kind: 'choice',
    tests: 'proving something about every stable matching at once',
    quote:
      'Everybody is either good or bad, and there are k good students and k good schools.\n' +
      'Every list ranks every good person on the other side above every bad one.',
    prompt:
      'In every stable matching, every good student is matched to a good school. What is the argument?',
    options: [
      {
        t: 'Because the process settles the good people first, and by the time it reaches the bad ones the good ones are taken.',
        why: 'The process has no notion of good and bad, and a good person can be displaced very late. The claim is about every stable matching, including ones no run ever produces, so no argument about the order of asks can reach it.',
      },
      {
        t: 'Suppose a good student had a bad school. Then at most k − 1 of the k good schools have good students, so some good school has a bad student, and those two would both switch.',
        ok: true,
        why: 'Counting, then one blocking pair. The misplaced good student uses up a good school without occupying it, so some good school is left with a bad student, and that good student and that good school each prefer the other to what they have.',
      },
      {
        t: 'Because a good student ranks every good school above every bad one, so they would never accept a bad school.',
        why: 'Nobody accepts or declines anything in a matching: a matching is a pairing, and stability is the only constraint on it. People end up low on their own list all the time when nobody better wants them.',
      },
      {
        t: 'It is false. With k = 1 the single good student can end up with the single bad school.',
        why: 'Try it. If the one good student had a bad school, the one good school would have a bad student, and those two are each other first choice. The pair blocks, so no such matching is stable.',
      },
    ],
    close:
      'This is the shape of most claims about every stable matching: assume one is wrong, count until two people are provably misplaced, and show they block. No algorithm appears anywhere in it.',
  },

  {
    id: 'forbidden-pairs',
    tier: 4,
    kind: 'choice',
    tests: 'which part a variant actually changes',
    prompt:
      'Some pairs are forbidden outright, so a student is ranked only by the schools they could actually attend. What does that change?',
    options: [
      {
        t: 'Nothing. A forbidden pair is the same as being ranked last.',
        why: 'Last is still acceptable. A matching that pairs a forbidden couple is not a bad matching, it is not a matching at all, and no ranking can express that difference.',
      },
      {
        t: 'People can end up matched to nobody, so stability grows three more cases: an unmatched person somebody prefers, on either side, and two unmatched people who are allowed each other.',
        ok: true,
        why: 'A stable matching no longer has to be perfect, and once it need not be, the definition has to say what an unmatched person can complain about. The process itself changes by one word: keep asking while there is a free asker who has not asked everybody they are allowed to.',
      },
      {
        t: 'A stable matching need not exist any more, so the question becomes which instances have one.',
        why: 'One always exists, by the same process on the shortened lists. What changes is the definition of stable, not whether anything satisfies it.',
      },
      {
        t: 'The process stops finishing, because an asker can run out of list.',
        why: 'Running out of list is exactly what now happens, and it is fine: that person is unmatched and asks no more. The counting argument is untouched, since the lists got shorter rather than longer.',
      },
    ],
    close:
      'The algorithm survives most variations with one change to the loop. Where the work moves is the definition of what it means to hold, and a definition with four cases instead of one is a definition somebody had to get right.',
  },

  {
    id: 'hospitals-and-residents',
    tier: 4,
    kind: 'choice',
    tests: 'unequal sides and more than one seat',
    prompt:
      'Hospitals have several posts each, there are more graduating students than posts, and every post has to be filled. How does the algorithm handle it?',
    options: [
      {
        t: 'It cannot: with unequal numbers no stable assignment exists.',
        why: 'One always exists. Some students end with nothing, by arithmetic, and the definition of stable is extended to cover them: an unmatched student and a hospital that would rather have them than somebody it has is an instability.',
      },
      {
        t: 'Run the ordinary process on as many students as there are posts, and set the rest aside.',
        why: 'The students set aside are exactly where the instability would live. One of them may be preferred by a hospital to somebody it took, and the definition has a case for precisely that.',
      },
      {
        t: 'Each hospital holds its q best askers so far instead of one, and stability gains a case for unmatched students. A stable assignment always exists.',
        ok: true,
        why: 'A hospital with q posts is q hospitals with one post and the same list, so splitting it turns the variant into the ordinary problem and the ordinary proofs come along unchanged. Holding q at a time is how that is implemented rather than a different algorithm.',
      },
      {
        t: 'Assign every student to the hospital that ranks them highest, then fix the hospitals that end up over their limit.',
        why: 'Fixing the over-subscribed hospitals is the entire problem rather than a tidying step, and nothing about this start makes the fixing easier.',
      },
    ],
    close:
      'This variant came first. The National Resident Matching Program had been running a version of this algorithm for ten years when Gale and Shapley published in 1962, and the generalisation costs one line, because a hospital with q posts is q hospitals with one.',
  },

  {
    id: 'ties',
    tier: 4,
    kind: 'choice',
    tests: 'what indifference costs',
    quote:
      'Allow ties, so a school can be indifferent between two students.\n' +
      'A pair blocks STRONGLY if each strictly prefers the other to their partner.\n' +
      'A pair blocks WEAKLY if one strictly prefers the other, and the other is indifferent or also strictly prefers.',
    prompt: 'Which of these is true?',
    options: [
      {
        t: 'Both always exist, because the ties can be broken arbitrarily first.',
        why: 'Tie-breaking buys the strong notion and not the weak one. Breaking a tie in favour of one person stops the other from blocking in the strict instance, and they are still blocking weakly in the original.',
      },
      {
        t: 'Neither need exist, because with ties the process can loop.',
        why: 'The process cannot loop: break the ties any way at all and it is the ordinary process on strict lists, which stops in at most n² asks.',
      },
      {
        t: 'A matching with no strongly blocking pair always exists; one with no weakly blocking pair need not.',
        ok: true,
        why: 'For the first, break the ties arbitrarily and run the process: a pair who both strictly prefer each other in the original also do so after any tie-break, so no strongly blocking pair survives. For the second, take two students who both rank MIT above NYU, with both schools indifferent between them. Whichever way they are paired, the student at NYU strictly prefers MIT and MIT is indifferent, so every matching has a weakly blocking pair.',
      },
      {
        t: 'Both need not exist, and which one you get depends on how the ties are broken.',
        why: 'The strong one always exists, whichever way the ties are broken. And the counterexample for the weak one defeats every matching of that instance, so no tie-break can rescue it either.',
      },
    ],
    close:
      'Ties are the expensive relaxation, and the cost lands on the notion that survives. Matchings with no strongly blocking pair always exist, and once lists may also be incomplete they can differ in size, at which point finding a largest one is NP-hard. The other notion is the opposite: a matching with no weakly blocking pair need not exist at all, and when one does it can be found in polynomial time. That is why every clean statement on this page begins by assuming strict and complete lists.',
  },
];

export function questionsIn(tier: Tier): readonly Question[] {
  return QUESTIONS.filter((q) => q.tier === tier);
}

export const TIER_LABELS: Readonly<Record<Tier, string>> = {
  1: 'Tier 1 · the run',
  2: 'Tier 2 · on paper',
  3: 'Tier 3 · textbook',
  4: 'Tier 4 · variants',
};

export const TIERS: readonly Tier[] = [1, 2, 3, 4];
