import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // TODO: Authenticate user
  // TODO: Fetch user's classes from the database

  // Skeleton response returning mock schedule data
  const mockSchedule = [
    {
      id: "event-1",
      title: "COMPSCI 311",
      building: "Manning CICS",
      room: "145",
      startTime: "10:00 AM",
      endTime: "11:15 AM",
      days: ["Tue", "Thu"]
    },
    {
      id: "event-2",
      title: "COMPSCI 320",
      building: "Integrative Learning Center",
      room: "S131",
      startTime: "11:30 AM",
      endTime: "12:45 PM",
      days: ["Tue", "Thu"]
    }
  ];

  return NextResponse.json({ success: true, data: mockSchedule });
}

export async function POST(request: Request) {
  // TODO: Authenticate user
  const body = await request.json();
  
  // TODO: Validate incoming class data and insert into database
  
  return NextResponse.json({ 
    success: true, 
    message: "Class added manually",
    event: { id: "new-event-id", ...body }
  }, { status: 201 });
}