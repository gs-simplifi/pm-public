const updateSerialNo = async ({
  modelName,
  sNoName,
  updateArray,
  updateBody,
  type,
  previosuSerial,
}) => {
  // console.log(modelName, sNoName, updateArray, previosuSerial, updateBody._id);

  let start = previosuSerial;
  let end = updateBody[sNoName];
  console.log(`Start: ${start}, end: ${end}`);
  if (type === 'update' && !previosuSerial) {
    throw new Error('Previous Serial Argument missing');
  }
  if (start === end) {
    return;
  }

  if (updateBody[sNoName] > updateArray.length) {
    throw new Error('Provided serial is incorrect');
  }

  console.log(updateBody[sNoName]);
  if (type === 'new') {
    let loopStart = 1;
    // // Last check - get serial number, and update other serial numbers.
    console.log('entered undefined / for an insert new loop');
    if (updateBody[sNoName] < 0) {
      updateBody[sNoName] = updateArray.length + 1;
    } else {
      if (updateBody[sNoName] === 0) {
        updateBody[sNoName] = 1;
      } else {
        loopStart = updateBody[sNoName];
        // console.log('enterd Update Tactical Step Serial Number Function');
        //position specified
      }
      updateArray.forEach(async (element) => {
        if (element[sNoName] >= loopStart) {
          element[sNoName] = element[sNoName] + 1;
          if (modelName === 'action') {
          } else if (modelName === 'tacticalStep') {
            element.riskPriorityWeight = updateBody.riskPriorityWeight;
          } else if (modelName === 'theme') {
          }

          await element.save();
        }
      });
    }
  } else if (type === 'update') {
    // console.log('entered Existing update loop');
    //   // console.log('Previous from tag: ', previosuSerial);
    //   // console.log('New from array: ', updateBody[sNoName]);

    if (updateBody[sNoName] < 0 || updateBody[sNoName] === updateArray.length) {
      end = updateArray.length;
    } else if (updateBody[sNoName] === 0) end = 1;

    updateArray.forEach(async (element) => {
      if (element['_id'].toString() !== updateBody['_id'].toString()) {
        if (start < end) {
          if (element[sNoName] > end || element[sNoName] < start) {
            // value stays
            // console.log('Entered Loop 2: ', element._id);
          } else {
            // console.log('Entered Loop 3: ', element._id);
            element[sNoName] = element[sNoName] - 1;
            await element.save();
          }
        } else {
          if (element[sNoName] < end || element[sNoName] > start) {
            // value stays
            // console.log('Entered Loop 4: ', element._id);
          } else {
            element[sNoName] = element[sNoName] + 1;
            await element.save();
            // console.log('Entered Loop 5: ', element._id);
          }
        }
        // console.log('Before save');
      }
    });
    updateBody[sNoName] = end;
  } else if (type === 'delete') {
    // console.log('entered here');
    previosuSerial = updateBody[sNoName];

    updateArray.forEach(async (element) => {
      if (element['_id'].toString() !== updateBody['_id'].toString()) {
        if (element[sNoName] < previosuSerial) {
          // value stays
          // console.log('Entered Loop a: ', element._id);
        } else {
          // console.log('Entered Loop b: ', element._id);
          element[sNoName] = element[sNoName] - 1;
          await element.save();
        }
      }
    });
  } else throw new Error('Wrong type defined');

  return;
};

module.exports = updateSerialNo;
