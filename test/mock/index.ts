export const MockApi = {
	query: {
		staking: {
			stakers: (stash: any) => {
				return {
					toJSON: () => {
						return {
							own: 50*10**12,
						};
					}
				}
			},
			validators: (stash: any) => {
				switch (stash) {
					case '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY':
						{
							return {
								toJSON: () => [
									{
										commission: '10000000'
									}
								]
							}
						}
						break;
					case '5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc':
						{
							return {
								toJSON: () => [
									{
										commission: '10000000'
									}
								]
							}
						}
						break;
					default:
						{
							return {
								toJSON: () => [
									{
										commission: '20000000'
									}
								]
							}
						}
				}
			}
		}
	}
}

export const MockConfig = {
	global: {
		test: false,
  },
  scorekeeper: {
    forceRound: false,
    nominating: false,
  }
};

export const MockDb = {
	allNodes: () => {
		return [
			{
				name: 'Alice',
				stash: '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY',
				offlineSince: 0,
				goodSince: new Date().getTime() - 8 * 24 * 60 * 60 * 1000,
				offlineAccumulated: 0,
				connectedAt: 0,
				nominatedAt: 1,
			},
			{
				name: 'Bob',
				stash: '5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc',
				offlineSince: 0,
				goodSince: new Date().getTime() - 8 * 24 * 60 * 60 * 1000,
				offlineAccumulated: 0,
				connectedAt: 1,
				nominatedAt: 0,
			},
			{
				name: 'Charlie',
				stash: null,	// Filters because no stash.
			},
			{
				name: 'Dave',
				stash: '5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc',
				offlineSince: 100,	// filter because offlineSince > 0
			},
			{
				name: 'Eve',
				stash: '5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc',
				offlineSince: 0,
				goodSince: new Date().getTime(), // filtered because not good for a week
			},
			{
				name: 'Ferdie',
				stash: '5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc',
				offlineSince: 0,
				goodSince: new Date().getTime() - 8 * 24 * 60 * 60 * 1000,
				offlineAccumulated: 0.021 * 7*24*60*60*1000, // filtered due to too much
			},
			{
				name: 'George',
				stash: '4HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc', // doesn't have commission set right
				offlineSince: 0,
				goodSince: new Date().getTime() - 8 * 24 * 60 * 60 * 1000,
				offlineAccumulated: 0,
			},
		]
  },
}
