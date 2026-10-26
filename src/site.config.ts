// Site-wide settings. Values were carried over from the Ghost admin
// (Settings + Source theme design settings) at migration time.
export const site = {
    url: 'https://junsong.xyz',
    title: "Jun's Log",
    description: 'Diving into Core',
    locale: 'en',
    timezone: 'Asia/Seoul',
    coverImage:
        'https://images.unsplash.com/photo-1725113114049-31121918636c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8YWxsfDIyfHx8fHx8Mnx8MTcyNTY5NjQ5MHw&ixlib=rb-4.0.3&q=80&w=2000',
    accentColor: '#02092a',
    // Links, tags and quote bars in dark mode (the navy accent is unreadable there).
    darkAccentColor: '#9db4ff',
    twitter: '@junsong_eth',
    postsPerPage: 12,

    // `ko` is the link used while browsing in Korean (defaults to `url`).
    navigation: [
        { label: 'Home', url: '/', ko: '/ko/' },
        { label: 'About', url: '/about/' },
        { label: 'Retrospect', url: '/tag/retrospect/', ko: '/ko/tag/retrospect/' },
        { label: 'Open-Source', url: '/tag/open-source/', ko: '/ko/tag/open-source/' },
        { label: 'EPF', url: 'https://epf.junsong.xyz/' },
    ] as { label: string; url: string; ko?: string }[],

    author: {
        slug: 'jun',
        name: 'Jun Song',
        bio: 'I am...\n- Fascinated by Ethereum Core Protocols\n- Currently on a break from CS at KAIST"',
        profileImage: '/content/images/2024/09/24382437_v642-nap-10-fastfood-min.jpg',
        location: 'Seoul',
        twitter: '@jun_song_over',
    },

    // giscus: comments live in this repo's Discussions ("Announcements", so only
    // giscus and the repo owner can open threads). IDs from https://giscus.app
    comments: {
        repo: 'syjn99/junsong.xyz',
        repoId: 'R_kgDOVUbk0Q',
        category: 'Announcements',
        categoryId: 'DIC_kwDOVUbk0c4DJjB-',
    },

    // Source theme "Design" settings
    theme: {
        siteBackgroundColor: '#f4f4f4',
        darkBackgroundColor: '#16181c',
        showPublishDate: true,
        showAuthor: false,
        showImagesInFeed: true,
        showSidebar: true,
        showPostMetadata: true,
        showRelatedArticles: true,
        showComments: true,
    },

    // Previously Ghost site-wide code injection (footer). Prism highlighting.
    footerScripts: [
        {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js',
            integrity: 'sha512-9khQRAUBYEJDCDVP2yw3LRUQvjJ0Pjx0EShmaQjcHa6AXiOv6qHQu9lCAIR8O+/D8FtaCoJ2c0Tf9Xo7hYH01Q==',
        },
        {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js',
            integrity: 'sha512-SkmBfuA2hqjzEVpmnMt/LINrjop3GKWqsuLSSB3e7iBmYK7JuWw4ldmmxwD9mdm2IRTTi0OxSAfEGvgEi0i2Kw==',
        },
    ],
};
