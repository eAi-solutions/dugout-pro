export interface Drill {
  id: string;
  title: string;
  category: string;
  description: string;
  isCustom?: boolean;
}

export interface PracticePlan {
  id: string;
  name: string;
  drills: Drill[];
  notes: string;
  createdAt: Date;
}

export const baseballDrills: Drill[] = [
  {
    id: "1",
    title: "Granderson's 'Sock' It",
    category: "Throwing, Hitting, Catching, Fielding Fly Balls",
    description: "Use a sock ball to practice throwing at targets for mechanics and arm strength. For hitting, toss the sock ball up and swing with your hand. For fielding, toss the sock ball to yourself to practice catching while moving forward/backward and with different hand positions, simulating outfield play."
  },
  {
    id: "2",
    title: "Reynolds' Swing Program",
    category: "Hitting",
    description: "Perform five one-handed swings in a specific part of the strike zone, then switch hands for another five, followed by one two-handed swing. Repeat in different zones to develop strong hands/forearms and cover the entire strike zone."
  },
  {
    id: "3",
    title: "Rizzo's Fielding Drill",
    category: "Fielding Ground Balls",
    description: "With a partner, have them throw the ball six times (three to the left, three to the right). Focus on keeping the glove visible and working on the drop step."
  },
  {
    id: "4",
    title: "Mabry's Backyard Drills",
    category: "Fielding Fly Balls, Fielding Ground Balls",
    description: "Hit balls off a makeshift tee. Field tennis balls off a roof to practice judging fly-ball angles. Field grounders off a wall."
  },
  {
    id: "5",
    title: "Dempster's Pitch Grips, Balance and Control",
    category: "Pitching, Throwing",
    description: "Practice pitch grips (four-seam fastball, two-seamer, slider, changeup) by holding a baseball to develop feel. Work on balance by getting into a set position and holding the front leg up for several seconds. Practice control by taping a makeshift strike zone on a wall and throwing a ball (tennis ball or baseball) at it, aiming for strikes. Also helps with fielding comebackers."
  },
  {
    id: "6",
    title: "1-2-3 Drill",
    category: "Hitting (Tee)",
    description: "A hitting drill focusing on the 1-2-3 rhythm. (Easy, 10m)"
  },
  {
    id: "7",
    title: "1-2-3 Rhythm Tee",
    category: "Hitting (Tee)",
    description: "A hitting drill focusing on rhythm using a tee. (Medium, 5m)"
  },
  {
    id: "8",
    title: "1st Base Flip to Pitcher",
    category: "Infield",
    description: "Drill for first basemen to practice flipping the ball to the pitcher. (Medium, 5m)"
  },
  {
    id: "9",
    title: "1st Base Inside Receiving",
    category: "Infield",
    description: "Drill for first basemen to practice receiving throws on the inside. (Medium, 5m)"
  },
  {
    id: "10",
    title: "1st Base Off Bag",
    category: "Infield",
    description: "Drill for first basemen to practice plays off the bag. (Medium, 5m)"
  },
  {
    id: "11",
    title: "1st Base Receiving",
    category: "Infield",
    description: "Basic drill for first basemen to practice receiving throws. (Easy, 5m)"
  },
  {
    id: "12",
    title: "1st Base Receiving Short Hops",
    category: "Infield",
    description: "Drill for first basemen to practice receiving short hops. (Medium, 5m)"
  },
  {
    id: "13",
    title: "2nd Baseman Backhand Flip",
    category: "Infield",
    description: "Drill for second basemen to practice backhand flips. (Medium, 5m)"
  },
  {
    id: "14",
    title: "2nd Baseman Drop Step Throw",
    category: "Infield",
    description: "Drill for second basemen to practice drop step throws. (Medium, 5m)"
  },
  {
    id: "15",
    title: "2nd Baseman Forehand Spin",
    category: "Infield",
    description: "Drill for second basemen to practice forehand spins. (Medium, 5m)"
  },
  {
    id: "16",
    title: "2nd Baseman Underhand Flip",
    category: "Infield",
    description: "Drill for second basemen to practice underhand flips. (Medium, 5m)"
  },
  {
    id: "17",
    title: "3-Man Relay",
    category: "Team Skill Development, Infield",
    description: "A three-person relay drill for skill development in the infield. (Medium, 10m)"
  },
  {
    id: "18",
    title: "30 Second Backhand",
    category: "Infield",
    description: "Quick drill focusing on backhand fielding. (Easy, 1m)"
  },
  {
    id: "19",
    title: "30 Second Backhand Cross",
    category: "Infield",
    description: "Quick drill focusing on backhand fielding across the body. (Medium, 1m)"
  },
  {
    id: "20",
    title: "30 Second Crow Hops",
    category: "Infield",
    description: "Quick drill focusing on crow hops for throwing. (Easy, 1m)"
  },
  {
    id: "21",
    title: "30 Second Grounders",
    category: "Infield",
    description: "Quick drill for fielding ground balls. (Easy, 1m)"
  },
  {
    id: "22",
    title: "30 Second Quick Toss",
    category: "Infield",
    description: "Quick tossing drill. (Easy, 1m)"
  },
  {
    id: "23",
    title: "30 Second Short Hops",
    category: "Infield",
    description: "Quick drill for fielding short hops. (Easy, 1m)"
  },
  {
    id: "24",
    title: "4 Corners",
    category: "Infield",
    description: "A four-corner infield drill. (Easy, 10m)"
  },
  {
    id: "25",
    title: "4 Corners Bunting",
    category: "Hitting",
    description: "A four-corner drill focusing on bunting. (Medium, 15m)"
  }
];

