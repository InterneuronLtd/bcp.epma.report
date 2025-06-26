//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2025  Interneuron Limited

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { DrugChartComponent } from './drug-chart/drug-chart.component';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ModalModule, BsModalRef } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';

import { NumberToWordsPipe } from '../directives/number-to-words.pipe';

import { PrintDischargeComponent } from './print-discharge/print-discharge.component';
import { TemplateNumberComponent } from './template-number/template-number.component';
import { DemoAdmissionRecordComponent } from './demo-admission-record/demo-admission-record.component';
import { PrescriptionInfusionPrintTemplateComponent } from './prescription-infusion-print-template/prescription-infusion-print-template.component';
import { PrescriptionNonInfusionPrintTemplateComponent } from './prescription-non-infusion-print-template/prescription-non-infusion-print-template.component';
import { TabsModule } from 'ngx-bootstrap/tabs';
@NgModule({
  declarations: [


    DrugChartComponent,
    NumberToWordsPipe,
    PrintDischargeComponent,
    TemplateNumberComponent,
    DemoAdmissionRecordComponent,
    PrescriptionInfusionPrintTemplateComponent,
    PrescriptionNonInfusionPrintTemplateComponent,
  ],
  imports: [
    PopoverModule.forRoot(),
    BsDropdownModule.forRoot(),
    BrowserAnimationsModule,
    BsDatepickerModule.forRoot(),
    CommonModule, FormsModule, ModalModule.forRoot(), ReactiveFormsModule,
    TabsModule.forRoot(),
  ],
  exports: [
    DrugChartComponent,  
    PrintDischargeComponent,
    DemoAdmissionRecordComponent
  ]
})
export class ComponentsModule { }
