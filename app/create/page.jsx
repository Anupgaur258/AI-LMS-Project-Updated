'use client';

import React, { useState, useEffect } from 'react';
import SelectOptions from './_components/SelectOptions';
import { Button } from '@/components/ui/button';
import TopicInputs from './_components/TopicInputs';
import axios from 'axios';
import { Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';

const Create = () => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    console.log('Updated FormData:', formData);
  }, [formData]);

  const handleUserInput = (fieldName, fieldValue) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: fieldValue,
    }));
  };

  const GenerateCourseOutline = async () => {
    try {
      if (!formData.topic || !formData.topic.trim()) {
        setError('Please enter a topic first.');
        return;
      }
      setLoading(true);
      setError(null);
      const result = await axios.post('/api/generate-course-outline', {
        ...formData,
        difficultyLevel: formData.difficultyLevel || 'easy',
      });
      console.log('API Response:', result.data);
      setLoading(false);
      router.replace('/dashboard');
    } catch (error) {
      console.error('Error generating course outline:', error);
      setError(
        error.response?.data?.error || 'Failed to generate course outline. Please check your API key or try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-center p-5 md:px-24 lg:px-36 mt-10'>
      <h2 className='font-bold text-3xl text-primary text-center'>
        Start Building Your Personal Study Material
      </h2>
      <p className='text-gray-600 text-center'>
        Fill in all details to generate study material for your next project.
      </p>

      <div className='mt-10 w-full'>
        {step === 0 ? (
          <SelectOptions
            selected={formData.studyType}
            selectedStudyType={(value) => handleUserInput('studyType', value)}
          />
        ) : (
          <TopicInputs
            topic={formData.topic}
            difficultyLevel={formData.difficultyLevel}
            setTopic={(value) => handleUserInput('topic', value)}
            setDifficultyLevel={(value) => handleUserInput('difficultyLevel', value)}
          />
        )}
      </div>

      <div className='flex items-center justify-between w-full mt-10'>
        {step > 0 ? (
          <Button onClick={() => setStep(step - 1)} variant='outline'>
            Previous
          </Button>
        ) : '_'}

        {step === 0 ? (
          <Button onClick={() => setStep(1)} disabled={!formData.studyType}>Next</Button>
        ) : (
          <Button onClick={GenerateCourseOutline} disabled={loading || !formData.topic?.trim()}>
            {loading ? <Loader className='animate-spin' /> : 'Generate'}
          </Button>
        )}
      </div>

      {loading && (
        <p className='text-gray-500 mt-4 text-sm text-center'>
          AI is building your course outline, this can take 10-30 seconds...
        </p>
      )}
      {error && <p className='text-red-500 mt-4'>{error}</p>}
    </div>
  );
};

export default Create;
