export interface Settings {
  approvals: {
    minimum?: number
    groups?: {
      [key: string]: {
        minimum?: number
        from: {
          users: string[]
        }
      }
    }
  }
}

function set_equal<T>(as: Set<T>, bs: Set<T>): boolean {
  if (as.size !== bs.size) {
    return false
  }
  for (const a of as) {
    if (!bs.has(a)) {
      return false
    }
  }
  return true
}

function set_intersect<T>(as: Set<T>, bs: Set<T>): Set<T> {
  return new Set([...as].filter(e => bs.has(e)))
}

function set_to_string<T>(as: Set<T>): string {
  return [...as].join(', ')
}

export class ReviewGatekeeper {
  private messages: string[]
  constructor(private settings: Settings, private approved_users: string[]) {
    this.messages = []
  }

  satisfy(): boolean {
    const approvals = this.settings.approvals
    let ret = true

    // check if the minimum criteria is met.
    if (approvals.minimum) {
      if (approvals.minimum > this.approved_users.length) {
        ret = false
        this.messages.push(
          `${approvals.minimum} reviewers should approve this PR (currently: ${this.approved_users.length})`
        )
      }
    }

    // check if the groups criteria is met.
    const approved = new Set(this.approved_users)
    if (approvals.groups) {
      for (const group in approvals.groups) {
        const required_users = new Set(approvals.groups[group].from.users)
        const approved_from_this_group = set_intersect(required_users, approved)
        const minimum_of_group = approvals.groups[group].minimum
        if (minimum_of_group) {
          if (minimum_of_group > approved_from_this_group.size) {
            ret = false
            this.messages.push(
              `${minimum_of_group} reviewers from the group '${group}' (${set_to_string(
                required_users
              )}) should approve this PR (currently: ${
                approved_from_this_group.size
              })`
            )
          }
        } else {
          // If no `minimum` option is specified, approval from all is required.
          if (!set_equal(approved_from_this_group, required_users)) {
            ret = false
            this.messages.push(
              `All of the reviewers from the group '${group}' (${set_to_string(
                required_users
              )}) should approve this PR`
            )
          }
        }
      }
    }
    return ret
  }

  getMessages(): string[] {
    return this.messages
  }
}
