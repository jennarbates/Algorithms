/**
 * Core domain types for the stable matching model.
 *
 * The model is deliberately one-to-one: every school has exactly one seat left
 * in this round. Capacities are a later extension, not something this file
 * pretends to support.
 */

export type StudentId = string;
export type SchoolId = string;

/** Which side of the market is doing the asking in a given run. */
export type Side = 'students' | 'schools';

/**
 * Ties in a preference list, written between neighbours: `tiedWithNext[k]` is
 * true when `prefs[k]` and `prefs[k + 1]` are tied, meaning the person has no
 * preference between them. A run of trues is one tied group.
 *
 * Absent, or all false, is a strict list, which is what every preset has and
 * what the process needs. Only the ties explorer ever sets it, and only
 * `core/ties` reads it: the process and the ordinary blocking-pair check both
 * refuse a list that has a tie in it, rather than quietly reading the order as
 * if it were strict.
 */
export type TiedWithNext = readonly boolean[];

export interface Student {
  readonly id: StudentId;
  readonly name: string;
  /**
   * One plain sentence on why their list is ordered the way it is.
   *
   * Absent for randomly generated instances, where there honestly is no story
   * behind the ordering and inventing one would be filler.
   */
  readonly reason?: string;
  /** School ids, most wanted first. Complete, and strict unless `tiedWithNext` says otherwise. */
  readonly prefs: readonly SchoolId[];
  /** Optional ties in `prefs`. See `TiedWithNext`. */
  readonly tiedWithNext?: TiedWithNext;
}

export interface School {
  readonly id: SchoolId;
  readonly name: string;
  /** One plain sentence on what this school is weighting. Absent when random. */
  readonly note?: string;
  /** Student ids, most wanted first. Complete, and strict unless `tiedWithNext` says otherwise. */
  readonly prefs: readonly StudentId[];
  /** Optional ties in `prefs`. See `TiedWithNext`. */
  readonly tiedWithNext?: TiedWithNext;
}

/**
 * A complete market: equal-sized sides with complete preferences, strict unless
 * a list says it has ties.
 */
export interface Instance {
  readonly id: string;
  readonly title: string;
  /** One line on what this instance exists to demonstrate. */
  readonly teaches: string;
  readonly students: readonly Student[];
  readonly schools: readonly School[];
}

/**
 * An arrangement, always written student to school so that runs in either
 * direction can be compared directly.
 *
 * A value of `null` means that student ended up with no school, which cannot
 * happen for a complete equal-sided instance but is representable so that
 * partial and hypothetical arrangements can be checked too.
 */
export type Matching = Readonly<Record<StudentId, SchoolId | null>>;

/**
 * A student and a school who would BOTH rather have each other than what they
 * currently have. One-sided longing is not a blocking pair. It takes two.
 */
export interface BlockingPair {
  readonly student: StudentId;
  readonly school: SchoolId;
}
