import { ExtractionRecord } from '../types';

export const SAMPLE_PRESETS = [
  {
    id: 'sample-engineering',
    title: 'Robotics Team Project Status',
    description: 'Weekly team log covering motor testing, latency fixes, and competition deadlines',
    text: `Alex: How is the drivetrain subsystem testing coming along?
Sam: The chassis build is 85% complete. We ran into a minor issue with the motor controller calibration yesterday, but the firmware update resolved it this morning. The full assembly will be ready for field trials by Friday.
Alex: Great work. Did you finish the sensor mount brackets as well?
Sam: Yes, the CNC-milled brackets were completed on Wednesday and are stored in the workshop bin.`,
  },
  {
    id: 'sample-budget',
    title: 'Student Council Budget & Sponsorship Report',
    description: 'Fundraising totals, ticket sales numbers, and semester financial goals',
    text: `Treasurer: For the fall festival campaign, we raised $1,420.50 in total revenue, which is 28% above our initial forecast. We confirmed 450 student ticket pre-orders, bringing our total registered attendees to 1,280. Our current operating surplus is $620.00, and our committee expects to reach our $2,500 goal by November 15th.`,
  },
  {
    id: 'sample-meeting',
    title: 'Committee Meeting Notes & Action Items',
    description: 'Voting outcomes, platform licensing decisions, and task assignments',
    text: `Committee Meeting Summary:
1. The committee voted 5 to 1 to select CloudScale to host our regional student portal.
2. The licensing cost was locked at $320.00 annually starting November 1st.
3. The service agreement guarantees 99.99% uptime with a 15-minute critical support response.
4. Action Item: Sarah will submit the signed faculty approval form by Friday at 5:00 PM.`,
  },
  {
    id: 'sample-research',
    title: 'Solar Cell Efficiency Study Notes',
    description: 'Perovskite test data, voltage parameters, and experimental findings',
    text: `Lab Testing Log:
1. Perovskite solar cells achieved 22.4% power conversion efficiency under standard 1.5 AM illumination.
2. Degradation remained under 3.5% across 500 continuous hours of thermal exposure.
3. Open-circuit voltage measured 1.18V with a fill factor of 0.79.
4. Sample batch C-4 will undergo ultraviolet stability testing next Tuesday.`,
  },
];

export const INITIAL_HISTORY: ExtractionRecord[] = [
  {
    id: 'rec-1',
    title: 'Robotics Drivetrain Status Notes',
    rawInput: `Alex: How is the drivetrain subsystem testing coming along?
Sam: The chassis build is 85% complete. We ran into a minor issue with the motor controller calibration yesterday, but the firmware update resolved it this morning. The full assembly will be ready for field trials by Friday.
Alex: Great work. Did you finish the sensor mount brackets as well?
Sam: Yes, the CNC-milled brackets were completed on Wednesday and are stored in the workshop bin.`,
    extractedAt: '2024-10-24T14:32:00Z',
    characterCount: 420,
    volume: 3,
    status: 'completed',
    entities: [
      {
        id: 'chunk-101',
        category: 'PROGRESS METRIC',
        verbatimText: 'The chassis build is 85% complete.',
        score: 98,
        level: 'strong',
        note: 'Direct quantitative progress indicator',
      },
      {
        id: 'chunk-102',
        category: 'ISSUE RESOLUTION',
        verbatimText: 'We ran into a minor issue with the motor controller calibration yesterday, but the firmware update resolved it this morning.',
        score: 82,
        level: 'partial',
        note: 'Describes the technical issue and resolution timing',
      },
      {
        id: 'chunk-103',
        category: 'TARGET DEADLINE',
        verbatimText: 'The full assembly will be ready for field trials by Friday.',
        score: 94,
        level: 'strong',
        note: 'Explicit milestone timeline',
      },
    ],
  },
  {
    id: 'rec-2',
    title: 'Fall Festival Budget Report',
    rawInput: 'We raised $1,420.50 in total revenue with 450 pre-orders and a $620.00 operating surplus.',
    extractedAt: '2024-10-22T09:15:00Z',
    characterCount: 104,
    volume: 2,
    status: 'completed',
    entities: [
      {
        id: 'chunk-201',
        category: 'TOTAL REVENUE',
        verbatimText: 'raised $1,420.50 in total revenue',
        score: 99,
        level: 'strong',
        note: 'Exact financial figure reported',
      },
      {
        id: 'chunk-202',
        category: 'ATTENDANCE',
        verbatimText: '450 pre-orders',
        score: 96,
        level: 'strong',
        note: 'Verified order count',
      },
    ],
  },
  {
    id: 'rec-3',
    title: 'Committee Platform Selection Vote',
    rawInput: 'Committee voted 5 to 1 to select CloudScale for $320.00 annual cost. Faculty approval due Friday.',
    extractedAt: '2024-10-19T16:45:00Z',
    characterCount: 110,
    volume: 2,
    status: 'completed',
    entities: [
      {
        id: 'chunk-301',
        category: 'DECISION',
        verbatimText: 'Committee voted 5 to 1 to select CloudScale for $320.00 annual cost',
        score: 95,
        level: 'strong',
        note: 'Formal vote outcome and contract value',
      },
      {
        id: 'chunk-302',
        category: 'ACTION ITEM',
        verbatimText: 'Faculty approval due Friday.',
        score: 92,
        level: 'strong',
        note: 'Action deadline with responsible owner',
      },
    ],
  },
];
