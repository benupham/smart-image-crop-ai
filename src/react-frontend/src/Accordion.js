import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';

const AccordionTitle = styled.h2`
  &:after: {
    content: '<';
    color: black;
    top: -2px;
    right: 0px;
    position: absolute;
  }
`;

const AccordionContent = styled.div`
  height: ${({ height }) => height}px;
  opacity: ${({ height }) => (height > 0 ? 1 : 0)};
  overflow: hidden;
  transition: 0.5s;
`;

export const Accordion = (props) => {
  const content = useRef(null);
  const [height, setHeight] = useState(1);
  const [direction, setDirection] = useState('down');

  const toggleAccordion = () => {
    console.log(content);
    console.log(height);
    setHeight(height === 0 ? content.current.scrollHeight : 0);
    setDirection(height === 0 ? 'down' : 'right');
  };

  useEffect(() => {
    if (height > 0) {
      setHeight(content.current.scrollHeight);
    }
  }, [height]);

  return (
    <>
      <AccordionTitle onClick={toggleAccordion}>
        {props.title}
        <i className={`arrow-accordion ${direction}`}></i>
      </AccordionTitle>
      <AccordionContent height={height} ref={content}>
        {props.children}
      </AccordionContent>
    </>
  );
};
