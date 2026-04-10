export const agents = [
  {
    id: 1,
    name: "Elon Musk",
    image:
      "/dp_1774271193834.jpeg"
    // "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Elon_Musk_-_54820081119_%28cropped%29.jpg/250px-Elon_Musk_-_54820081119_%28cropped%29.jpg"
    ,
    location: {
      lat: 19.076,
      lng: 72.8777,
    },
    customers: [
      {
        id: 1,
        name: "Yash",
        loan: "LN121",
        location: {
          lat: 19.09,
          lng: 72.892,
        },
        faceConfidence: 94,
        liveness: 92,
      },
      {
        id: 2,
        name: "Rahul",
        loan: "LN121",
        location: {
          lat: 19.118759832265702,
          lng: 73.23417547111625
        },
        faceConfidence: 98,
        liveness: 96,
      },
      {
        id: 3,
        name: "Yogesh",
        loan: "LN121",
        location: {
          lat: 18.77333472300998,
          lng: 73.41095273774131,
        },
        faceConfidence: 94,
        liveness: 92,
      },
    ],
  },
  {
    id: 2,
    name: "Random Person",
    image:
      "/my_pic_1774271182118.jpeg"
    // "https://randomuser.me/api/portraits/women/44.jpg"
    ,
    location: {
      lat: 19.03156696284031,
      lng: 72.95032576916336,
    },
    customers: [
      {
        id: 1,
        name: "Jackson",
        loan: "LN122",
        location: {
          lat: 19.07,
          lng: 72.88,
        },
        faceConfidence: 95,
        liveness: 93,
      },
    ],
  },
  {
    id: 3,
    name: "Alan Turing",
    image:
      "/MK_1_1774270112152.jpeg"
    //  "https://cdn.britannica.com/81/191581-050-8C0A8CD3/Alan-Turing.jpg"
    ,
    location: {
      lat: 19.050570392422397,
      lng: 72.8213746380985,
    },
    customers: [
      {
        id: 1,
        name: "Manish",
        loan: "LN124",
        location: {
          lat: 19.07,
          lng: 72.88,
        },
        faceConfidence: 95,
        liveness: 93,
      },
    ],
  },
  {
    id: 4,
    name: "Napolean",
    image:
      "/PIC_1774270519498.jpg"
    // "https://www.napoleon.org/wp-content/uploads/2020/05/napoleon_bas_uterwijk_1200_wider.jpg"
    ,
    location: {
      lat: 19.208706198794577,
      lng: 72.97165716552347,
    },
    customers: [
      {
        id: 1,
        name: "Denial",
        loan: "LN125",
        location: {
          lat: 19.110208259965884,
          lng: 73.0173686489385,
        },
        faceConfidence: 95,
        liveness: 93,
      },
      {
        id: 2,
        name: "Harley",
        loan: "LN125",
        location: {
          lat: 19.28893635218867,
          lng: 72.86689928463122,
        },
        faceConfidence: 95,
        liveness: 93,
      },
    ],
  },
];

// Static office location — shared by all agents
export const OFFICE = {
  lat: 19.1133869510231,
  lng: 72.91810580467191,
  name: "Bargad HQ",
};
