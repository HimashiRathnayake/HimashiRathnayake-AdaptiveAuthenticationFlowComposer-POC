import React, {useEffect, useState} from "react";
import {AddCondition, AddStepToCondition, AddStepToEnd, AddSuccessFailureSteps, GetConditionArguments, GetStepsFromAst} from "../Mapper/TraverseAst";
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import ReactFlow, {Background, Controls} from "react-flow-renderer";
import {ConditionNode, Nodes} from "./Nodes";
import {Condition, Edge, Element} from "./Elements";
import {Popup} from "./PopUp";
import {Dispatch} from "redux";
import {saveAstFromVisualEditor} from "../store/actionCreators";
import {GetRequest} from "../Mapper/TraverseAst";
import {DroppableContainer} from "./DroppableContainer";
import "../styles/visualEditor.css";

let uniqueStepList: any[] = []; //Array to keep a unique step list
let conditionList: any[] = [];
let x = 10; let y = 200;
let distanceX=300; let distanceY=150;
let lastStepX = 10; let lastStepY = 200;

export const VisualFlowGenerator: React.FC = () => {

    const [visible, setVisible] = useState(false);
    const [elementsList, setElements] : [any, any] = useState([]);
    const [params, setParams] : [any,any] = useState({});

    const ast : any = useSelector(
        (state:any) => {
            return state.astReducer.ast
        },
        shallowEqual
    )
    const dispatch: Dispatch<any> = useDispatch();

    const saveAstToStore = React.useCallback(
        (ast: Object) => dispatch(saveAstFromVisualEditor(ast)),
        [dispatch]
    );

    let stepsArray = GetStepsFromAst(ast);

    const createEdge = (source:string|null, target:string|null, color:string, label?:string) => {
        setElements((elements:any[])=>[...elements, Edge(`${source}${target}`, source, target, label, color)]);
    }

    const createElement = (step:string, x:number, y:number, condition?:boolean, args?:string[]) => {
        if(condition){
            setElements((elements:any[])=>[...elements, Condition(step, step, x, y, args)])
            conditionList.push(step);
        }else{
            setElements((elements:any[])=>[...elements, Element(step, step, x, y)])
            uniqueStepList.push(step);
        }
    }

    const onConnect = (params:any) => {
        setVisible(true);
        setParams(params);
    }

    const onCancel = () =>{
        setVisible(false);
    }

    const onSuccess = () => {
        setVisible(false);
        if(params.target==='hasAnyOfTheRoles'){
            let newAst = AddCondition(ast, params.source, params.target);
            saveAstToStore({});
            saveAstToStore(newAst);
        }
        else if(params.source==='hasAnyOfTheRoles'){
            let newAst = AddStepToCondition(ast, params.source, params.target);
            saveAstToStore({});
            saveAstToStore(newAst);
        }
        else{
            let newAst = AddSuccessFailureSteps(ast, params.source, params.target, 'success');
            saveAstToStore({});
            saveAstToStore(newAst);
        }
    }

    const onFailure = () => {
        setVisible(false);
        let newAst = AddSuccessFailureSteps(ast, params.source, params.target, 'fail');
        saveAstToStore({});
        saveAstToStore(newAst);
    }

    useEffect(()=>{
        uniqueStepList = [];
        conditionList = [];
        x=10; y=200; lastStepX=0; lastStepY=100; lastStepX = 10; lastStepY = 200;
        setElements([]);

        for (let step of stepsArray){
            let currentStep = step[1];
            let successSteps = step[2];
            let failureSteps = step[3];

            if (uniqueStepList.indexOf(currentStep)===-1){
                if(uniqueStepList.length>=1){
                    x=x+20; y=lastStepY;
                    let last = uniqueStepList[uniqueStepList.length-1];
                    createEdge(last, currentStep, '#D6D5E6');
                }
                createElement(currentStep, x, y);
                lastStepX=x;
                x+=distanceX;
            }

            if (successSteps!==undefined){
                let condition = successSteps[0];
                let successPath = successSteps[1];
                let remainSuccess=successSteps[2];

                if(condition!==undefined && conditionList.indexOf(condition)===-1){
                    y-=distanceY;
                    createElement(condition, x, y, true, GetConditionArguments(ast, condition).toString());
                    createEdge(currentStep, condition, 'green', 'Success');
                    x+=distanceX;
                }

                for (let successStep of successPath){
                    if (uniqueStepList.indexOf(successStep)===-1){
                        createElement(successStep, x, y);
                        x+=distanceX;
                    }
                    if (successPath.indexOf(successStep)===0){
                        createEdge(condition, successStep, 'green', 'Success');
                    }
                    else{
                        createEdge(successPath[successPath.indexOf(successStep)-1], successStep,'#D6D5E6');
                    }
                }

                for (let successStep of remainSuccess){
                    if (uniqueStepList.indexOf(successStep)===-1){
                        if (remainSuccess.indexOf(successStep)===0){
                            y-=distanceY;
                        }
                        createElement(successStep, x, y);
                        x+=distanceX;
                    }
                    if (remainSuccess.indexOf(successStep)===0){
                        createEdge(currentStep, successStep, 'green', 'Success');
                    }
                    else{
                        createEdge(remainSuccess[remainSuccess.indexOf(successStep)-1], successStep,'#D6D5E6');
                    }
                }
            }

            if (failureSteps!==undefined){
                x=lastStepX+distanceX;
                y=lastStepY+distanceY;
                for (let failureStep of failureSteps){
                    if (uniqueStepList.indexOf(failureStep)===-1){
                        createElement(failureStep, x, y);
                        x+=distanceX;
                    }
                    if (failureSteps.indexOf(failureStep)===0){
                        createEdge(currentStep, failureStep, '#c63046', 'Failure');
                    }
                    else{
                        createEdge(failureSteps[failureSteps.indexOf(failureStep)-1], failureStep,'#D6D5E6');
                    }
                }
            }
        }
        }, [ast]
    );

    const onDrop = (item:any) => {
        if(item.name==='Step') {
            let newStep = (Math.max.apply(Math, uniqueStepList.map((o) => {
                return +o;
            })) + 1).toString();
            if(newStep==='-Infinity'){
                let newAst = AddStepToEnd(ast);
                saveAstToStore({});
                saveAstToStore(newAst);
            }else {
                createElement(newStep, 600, 10);
            }
        }
        else if(item.name==='hasAnyOfTheRoles') {
            createElement('hasAnyOfTheRoles',600,10, true);
        }
    }

    return (
        <DroppableContainer className='Flow' containerName="Flow" onDrop={onDrop}>
            {GetRequest(ast) && <div className='Flow-container'>
                    {visible ? (
                        <Popup onCancel={onCancel} onSuccess={onSuccess} onFailure={onFailure}/>
                    ):(
                    <ReactFlow
                        elements={elementsList}
                        nodeTypes={{special: Nodes, condition: ConditionNode}}
                        onConnect={(params)=>onConnect(params)}
                    >
                        <Controls />
                        <Background color="#aaa" gap={16} />
                    </ReactFlow>)}
            </div>}
        </DroppableContainer>
    )

}