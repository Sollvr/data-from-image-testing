import { NextRequest, NextResponse } from 'next/server';

import OpenAI from "openai";



const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });



export async function POST(req: NextRequest) {

  try {

    const { base64Images, requirements } = await req.json();



    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {

      return NextResponse.json({ error: 'No images provided' }, { status: 400 });

    }



    // Process all images and combine results

    const results = await Promise.all(

      base64Images.map(async (base64Image, index) => {

        const result = await analyzeImage(base64Image, requirements);

        return `Image ${index + 1}:\n${result}`;

      })

    );



    return NextResponse.json({ 

      extractedText: results.join('\n\n') 

    });

  } catch (error) {

    console.error('API route error:', error);

    return NextResponse.json({ error: 'Failed to analyze images' }, { status: 500 });

  }

}



async function analyzeImage(base64Image: string, requirements?: string) {

  try {

    const prompt = `Please analyze this image and extract ONLY the following information:

${requirements || 'Extract all visible text'}



Important instructions for formatting the response:

1. Present each piece of information on a new line

2. Do not use labels or prefixes

3. Keep the format simple and clean

4. Focus only on extracting exactly what was requested

5. Do not add any additional text or explanations

6. If extracting multiple items of the same type (like names), list them one per line



Example format:

John Smith

Jane Doe

Robert Johnson

`;



    const visionResponse = await openai.chat.completions.create({

      model: "gpt-4o",

      messages: [

        {

          role: "user",

          content: [

            { type: "text", text: prompt },

            {

              type: "image_url",

              image_url: {

                url: `data:image/jpeg;base64,${base64Image}`

              }

            }

          ],

        },

      ],

      max_tokens: 1500,

      temperature: 0.3,

    });



    const content = visionResponse.choices[0].message.content || "";

    

    return content

      .split('\n')

      .map(line => line.trim())

      .filter(line => line.length > 0)

      .join('\n');

  } catch (error) {

    console.error("OpenAI API error:", error);

    throw new Error("Failed to analyze image");

  }

}
