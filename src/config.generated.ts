export interface Config {
    /**
     * Repository details
     */
    details?: Details;
    /**
     * There is no API for this yet!
     *
     * Discussions settings.
     */
    discussions?: Discussions;
    /**
     * There is no API for this yet!
     *
     * Repository homepage settings.
     */
    homePage?: HomePage;
    /**
     * Issues settings
     */
    issues?: Issues;
    /**
     * Projects settings
     */
    projects?: Projects;
    /**
     * Pull requests settings
     */
    pullRequests?: PullRequests;
    /**
     * Wikis settings
     */
    wikis?: Wikis;
}

/**
 * Repository details
 */
export interface Details {
    /**
     * Description
     */
    description?: string;
    /**
     * Topics
     */
    topics?: string[];
    /**
     * Website URL
     */
    website?: string;
}

/**
 * There is no API for this yet!
 *
 * Discussions settings.
 */
export interface Discussions {
    /**
     * Enabled
     */
    enabled?: boolean;
}

/**
 * There is no API for this yet!
 *
 * Repository homepage settings.
 */
export interface HomePage {
    /**
     * Display environments on homepage
     */
    environmentsDisplayed?: boolean;
    /**
     * Display packages on homepage
     */
    packagesDisplayed?: boolean;
    /**
     * Display releases on homepage
     */
    releasesDisplayed?: boolean;
}

/**
 * Issues settings
 */
export interface Issues {
    /**
     * Enabled
     */
    enabled?: boolean;
}

/**
 * Projects settings
 */
export interface Projects {
    /**
     * Enabled
     */
    enabled?: boolean;
}

/**
 * Pull requests settings
 */
export interface PullRequests {
    /**
     * There is no API for this yet!
     *
     * Allow auto-merge.
     *
     * Waits for merge requirements to be met and then merges automatically.
     */
    autoMergeEnabled?: boolean;
    /**
     * Automatically delete head branches.
     *
     * Deleted branches will still be able to be restored.
     */
    deleteBranchOnMergeEnabled?: boolean;
    /**
     * Allow merge commits.
     *
     * Add all commits from the head branch to the base branch with a merge commit.
     */
    mergeCommitsEnabled?: boolean;
    /**
     * Allow rebase merging.
     *
     * Add all commits from the head branch onto the base branch individually.
     */
    rebaseMergingEnabled?: boolean;
    /**
     * Allow squash merging.
     *
     * Combine all commits from the head branch into a single commit in the base branch.
     */
    squashMergingEnabled?: boolean;
}

/**
 * Wikis settings
 */
export interface Wikis {
    /**
     * There is no API for this yet!
     *
     * Restrict editing to users with push access only.
     */
    editingRestrictedToUsersWithPushAccessOnly?: boolean;
    /**
     * Enabled
     */
    enabled?: boolean;
}
