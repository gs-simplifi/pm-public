const TactiocalStep = require('../models/tacticalStep');

const updateTacticalStepSerialNo = async (
  tacticalStepArray,
  tacticalStepBody,
  previosuSerial
) => {
  let loopStart = 1;
  // Last check - get serial number, and update other serial numbers.
  if (!previosuSerial) {
    if (tacticalStepBody.sNoInAction < 0) {
      tacticalStepBody.sNoInAction = tacticalStepArray.length + 1;
    } else {
      if (tacticalStepBody.sNoInAction === 0) {
        // first position
        tacticalStepBody.sNoInAction = 1;
      } else {
        loopStart = tacticalStepBody.sNoInAction;
        console.log('enterd Update Tactical Step Serial Number Function');
        //position specified
      }
      tacticalStepArray.forEach(async (element) => {
        if (element.sNoInAction >= loopStart) {
          element.sNoInAction = element.sNoInAction + 1;
          element.riskPriorityWeight = tacticalStepBody.riskPriorityWeight;
          await element.save();
        }
      });
    }
  } else {
    // console.log('Previous from tag: ', previosuSerial);
    // console.log('New from array: ', tacticalStepBody.sNoInAction);
    let start = previosuSerial;
    let end = tacticalStepBody.sNoInAction;
    console.log(`Start: ${start}, end: ${end}`);

    if (start === end) {
      return;
    }

    if (
      tacticalStepBody.sNoInAction < 0 ||
      tacticalStepBody.sNoInAction === tacticalStepArray.length
    ) {
      end = tacticalStepArray.length;
    } else if (tacticalStepBody.sNoInAction === 0) end = 1;

    console.log(
      'enterd Update Tactical Step Serial Number Function - FROM UPDATE'
    );
    //position specified
    // console.log(tacticalStepBody._id);
    // throw new Error('taken a break');
    tacticalStepArray.forEach(async (element) => {
      if (element._id.toString() !== tacticalStepBody._id.toString()) {
        if (start < end) {
          if (element.sNoInAction > end || element.sNoInAction < start) {
            // value stays
            console.log('Entered Loop 2: ', element._id);
          } else {
            console.log('Entered Loop 3: ', element._id);
            element.sNoInAction = element.sNoInAction - 1;
          }
        } else {
          if (element.sNoInAction < end || element.sNoInAction > start) {
            // value stays
            console.log('Entered Loop 4: ', element._id);
          } else {
            element.sNoInAction = element.sNoInAction + 1;
            console.log('Entered Loop 5: ', element._id);
          }
        }
        element.save();
      }
    });
    tacticalStepBody.sNoInAction = end;
  }

  return;
};

module.exports = updateTacticalStepSerialNo;
