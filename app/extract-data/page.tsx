'use client'







import { useState, useEffect } from 'react'



import { Button } from "@/components/ui/button"



import { Card } from "@/components/ui/card"



import { Input } from "@/components/ui/input"



import { Textarea } from "@/components/ui/textarea"



import { Copy, Upload, HelpCircle, LogOut } from 'lucide-react'



import { supabase } from '@/lib/supabase'



import { useRouter } from 'next/navigation'



import {



  Tooltip,



  TooltipContent,



  TooltipProvider,



  TooltipTrigger,



} from "@/components/ui/tooltip"







type User = {



  id: string;



  email?: string;



  created_at?: string;



  updated_at?: string;



  app_metadata?: {



    provider?: string;



    [key: string]: unknown;



  };



  user_metadata?: {



    [key: string]: unknown;



  };



  aud?: string;



  role?: string;



  email_confirmed_at?: string;



  phone?: string;



  confirmed_at?: string;



  last_sign_in_at?: string;



  factor_id?: string;



}







export default function Component() {



  const [prompt, setPrompt] = useState('')



  const [tags, setTags] = useState<string[]>([])



  const [newTag, setNewTag] = useState('')



  const [extractedText, setExtractedText] = useState('')



  const [isProcessing, setIsProcessing] = useState(false)



  const [files, setFiles] = useState<File[]>([])



  const router = useRouter()



  const [user, setUser] = useState<User | null>(null)







  useEffect(() => {



    const getUser = async () => {



      const { data: { user } } = await supabase.auth.getUser()



      setUser(user)



    }



    getUser()



  }, [])







  const handleSignOut = async () => {



    await supabase.auth.signOut()



    router.push('/auth')



  }







  const handleDrop = (e: React.DragEvent) => {



    e.preventDefault()



    const droppedFiles = Array.from(e.dataTransfer.files)



    setFiles(prev => [...prev, ...droppedFiles])



  }







  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {



    if (e.target.files) {



      const selectedFiles = Array.from(e.target.files)



      setFiles(prev => [...prev, ...selectedFiles])



    }



  }







  const handleAddTag = () => {



    if (newTag && !tags.includes(newTag)) {



      setTags(prev => [...prev, newTag])



      setNewTag('')



    }



  }







  const removeTag = (tagToRemove: string) => {



    setTags(tags.filter(tag => tag !== tagToRemove))



  }







  const processImages = async () => {



    setIsProcessing(true)



    try {



      const base64Images = await Promise.all(



        files.map(file => {



          return new Promise<string>((resolve, reject) => {



            const reader = new FileReader()



            reader.onload = e => {



              const result = (e.target?.result as string).split(',')[1]



              resolve(result)



            }



            reader.onerror = error => reject(error)



            reader.readAsDataURL(file)



          })



        })



      )







      const response = await fetch('/api/extract-text', {



        method: 'POST',



        headers: {



          'Content-Type': 'application/json',



        },



        body: JSON.stringify({



          base64Images,



          requirements: prompt



        })



      })







      const data = await response.json()



      setExtractedText(data.extractedText || 'No text extracted')







      if (data.extractedText && user) {



        await Promise.all(files.map(async (file, index) => {



          await supabase



            .from('extractions')



            .insert({



              user_id: user.id,



              filename: file.name,



              extracted_text: data.extractedText.split('\n\n')[index] || '',



              requirements: prompt,



              patterns: {}



            })



        }))



      }



    } catch (error) {



      console.error('Error processing images:', error)



    } finally {



      setIsProcessing(false)



    }



  }







  return (



    <div className="min-h-screen bg-background">



      <header className="border-b">



        <div className="container flex items-center justify-between h-14">



          <h1 className="text-2xl font-bold">Extract Text</h1>



          <nav className="flex items-center gap-4">



            <Button variant="ghost" size="icon" onClick={handleSignOut}>



              <LogOut className="w-5 h-5" />



            </Button>



          </nav>



        </div>



      </header>







      <main className="container py-6">



        <div className="grid gap-6 lg:grid-cols-2">



          <div className="space-y-6">



            <Card className="p-6">



              <div className="flex items-center gap-2 mb-4">



                <h2 className="text-lg font-semibold">Upload Images</h2>



                <TooltipProvider>



                  <Tooltip>



                    <TooltipTrigger>



                      <HelpCircle className="w-4 h-4 text-muted-foreground" />



                    </TooltipTrigger>



                    <TooltipContent>



                      <p>Upload images to extract text from</p>



                    </TooltipContent>



                  </Tooltip>



                </TooltipProvider>



              </div>







              <Textarea



                placeholder="Specify what information you want to extract from the images (e.g., 'Extract all dates and amounts from these receipts')"



                value={prompt}



                onChange={(e) => setPrompt(e.target.value)}



                className="mb-4"



              />







              <div



                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"



                onDrop={handleDrop}



                onDragOver={(e) => e.preventDefault()}



                onClick={() => document.getElementById('file-input')?.click()}



              >



                <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />



                <p className="text-lg font-medium">Drop your images here or click to upload</p>



                <p className="text-sm text-muted-foreground mt-1">



                  Supports multiple files: PNG, JPG, JPEG, GIF



                </p>



                <input



                  id="file-input"



                  type="file"



                  multiple



                  accept="image/*"



                  className="hidden"



                  onChange={handleFileInput}



                />



              </div>







              {files.length > 0 && (



                <div className="mt-4">



                  <p className="font-medium mb-2">Selected files:</p>



                  <ul className="space-y-1">



                    {files.map((file, index) => (



                      <li key={index} className="text-sm text-muted-foreground">



                        {file.name}



                      </li>



                    ))}



                  </ul>



                </div>



              )}



            </Card>







            <Card className="p-6">



              <div className="flex items-center gap-2 mb-4">



                <h2 className="text-lg font-semibold">Tags</h2>



                <TooltipProvider>



                  <Tooltip>



                    <TooltipTrigger>



                      <HelpCircle className="w-4 h-4 text-muted-foreground" />



                    </TooltipTrigger>



                    <TooltipContent>



                      <p>Add tags to help categorize the extraction</p>



                    </TooltipContent>



                  </Tooltip>



                </TooltipProvider>



              </div>







              <div className="flex gap-2">



                <Input



                  placeholder="Add a tag..."



                  value={newTag}



                  onChange={(e) => setNewTag(e.target.value)}



                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}



                />



                <Button onClick={handleAddTag}>Add</Button>



              </div>







              {tags.length > 0 && (



                <div className="flex flex-wrap gap-2 mt-4">



                  {tags.map(tag => (



                    <span



                      key={tag}



                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm flex items-center gap-1"



                    >



                      {tag}



                      <button



                        onClick={() => removeTag(tag)}



                        className="hover:text-destructive"



                      >



                        ×



                      </button>



                    </span>



                  ))}



                </div>



              )}



            </Card>







            <Button



              className="w-full"



              size="lg"



              onClick={processImages}



              disabled={isProcessing || files.length === 0}



            >



              {isProcessing 



                ? `Processing ${files.length} image${files.length > 1 ? 's' : ''}...` 



                : 'Extract Text'}



            </Button>



          </div>







          <Card className="p-6">



            <div className="flex items-center justify-between mb-4">



              <div className="flex items-center gap-2">



                <h2 className="text-lg font-semibold">Extracted Content</h2>



                <TooltipProvider>



                  <Tooltip>



                    <TooltipTrigger>



                      <HelpCircle className="w-4 h-4 text-muted-foreground" />



                    </TooltipTrigger>



                    <TooltipContent>



                      <p>Extracted text will appear here</p>



                    </TooltipContent>



                  </Tooltip>



                </TooltipProvider>



              </div>



              <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(extractedText)}>



                <Copy className="w-4 h-4" />



              </Button>



            </div>







            <div className="min-h-[200px] bg-muted/50 rounded-lg p-4">



              {extractedText ? (



                <pre className="whitespace-pre-line">{extractedText}</pre>



              ) : (



                <p className="text-muted-foreground text-center mt-8">



                  Upload an image to extract text



                </p>



              )}



            </div>



          </Card>



        </div>



      </main>



    </div>



  )



}














