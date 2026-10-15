import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // TODO: Parse the request body (email, password, etc.)
  const body = await request.json();
  
  // TODO: Hash password and insert into the database
  console.log("Mock DB Insert: Adding user", body.email);

  return NextResponse.json({ 
    success: true, 
    message: "User registered successfully",
    userId: "mock-user-id-123" 
  }, { status: 201 });
}